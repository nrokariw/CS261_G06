package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.RequestStatus;
import com.example.demo.dto.BorrowRequestDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.UserRepository;

import org.springframework.cglib.core.Local;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class BorrowRequestService {

    private final BorrowRequestRepository borrowRequestRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;

    public BorrowRequestService(BorrowRequestRepository borrowRequestRepository,
                                ItemRepository itemRepository,
                                UserRepository userRepository) {
        this.borrowRequestRepository = borrowRequestRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    // 1. ผู้ยืมสร้างคำขอยืม (Borrow Request)
    @Transactional
    public BorrowRequest requestBorrow(String borrowerId, BorrowRequestDto dto) {
        // ตรวจสอบว่ามี User และ Item อยู่จริงไหม จาก database
        User borrower = userRepository.findById(borrowerId)
                .orElseThrow(() -> new RuntimeException("Borrower not found: " + borrowerId));
        Item item = itemRepository.findById(dto.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + dto.getItemId()));
        
        // 1)เช็คว่าได้ยืมของตัวเองไหม (โยน IllegalArgumentException -> Handler จะแปลงเป็น 400 Bad Request)
        if (item.getOwnerId().equals(borrowerId)) {
            throw new IllegalArgumentException("Item cannot borrow your own belongings");
        }

        // ตรวจสอบว่าผู้ยืมคนนี้เคยถูก REJECT ในสิ่งของชิ้นนี้หรือไม่ (Permanent Block จนกว่าเจ้าของจะ Reset)
        List<BorrowRequest> existingRequests = borrowRequestRepository.findByItemIdAndBorrowerId(dto.getItemId(), borrowerId);
        boolean isBlocked = existingRequests.stream()
                .anyMatch(r -> r.getStatus() == RequestStatus.REJECTED);
        if (isBlocked) {
            throw new SecurityException("You have been blocked from requesting this item by the owner");
        }

        // 2)เช็คว่าไอเท็มนี้พร้อมให้ยืมไหม (โยน IllegalStateException -> Handler จะแปลงเป็น 409 Conflict)
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new IllegalStateException("Item is not available for borrow");
        }

        // 3)เช็คว่าวันที่คืนไม่ได้อยู่ก่อนวันที่เริ่มยืมใช่ไหม (โยน IllegalArgumentException -> แปลงเป็น 400 Bad Request)
        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("The return date must not be before the date the loan began");
        }

        // ตรวจสอบกรอบเวลาที่เปิดให้ยืม (Available Date Range)
        if (item.getAvailableFrom() != null && dto.getStartDate().isBefore(item.getAvailableFrom())) {
            throw new IllegalArgumentException("Requested start date is before the item's available window: " + item.getAvailableFrom());
        }
        if (item.getAvailableUntil() != null && dto.getEndDate().isAfter(item.getAvailableUntil())) {
            throw new IllegalArgumentException("Requested end date is after the item's available window: " + item.getAvailableUntil());
        }


        // เรียกใช้ฟังก์ชัน requestBorrow จาก User Model (ข้างในกำหนด createdAt เป็น UTC+0 แล้ว)
        BorrowRequest request = borrower.requestBorrow(
            dto.getItemId(),
            dto.getStartDate(),
            dto.getEndDate(),
            dto.getReason()
        );
        if (dto.getReason() != null && !dto.getReason().trim().isEmpty()) {
            request.setReason(dto.getReason().trim());
        }

        return borrowRequestRepository.save(request);
    }

    // 2. ผู้ยืมยกเลิกคำขอยืม 
    @Transactional
    public BorrowRequest cancelRequest(String requestId) {
        return cancelRequest(requestId, null);
    }

    @Transactional
    public BorrowRequest cancelRequest(String requestId, String borrowerId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Borrow Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

        if (borrowerId == null || borrowerId.isBlank() || !request.getBorrowerId().equals(borrowerId)) {
            throw new SecurityException("Unauthorized: Only the borrower of this request can cancel it");
        }

        // เปลี่ยนสถานะคำขอเป็น CANCELLED
        request.cancel();

        // ดึงสถานะ Item อัตโนมัติ (จะได้ ItemStatus.UNAVAILABLE)
        ItemStatus nextItemStatus = request.getStatus().getItemStatus();
        if (nextItemStatus != null) {
            item.setStatus(nextItemStatus);
        }

        itemRepository.save(item);
        return borrowRequestRepository.save(request);
    }

    // 3.เจ้าของกดอนุมัติคำขอ
    @Transactional
    public BorrowRequest approveRequest(String requestId, String ownerId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

        // ตรวจสอบว่าคนที่กดอนุมัติ เป็นเจ้าของไอเท็มชิ้นนี้จริงๆ หรือไม่ (Security Check)
        if (ownerId == null || ownerId.isBlank() || !item.getOwnerId().equals(ownerId)) {
            throw new SecurityException("Unauthorized: You are not the owner of this item");
        }

        // ตรวจสอบว่าไอเท็มยังพร้อมให้ยืมหรือไม่ (ถ้าถูก ACCEPTED/RESERVED หรือ BORROWED ไปแล้ว จะอนุมัติซ้ำไม่ได้)
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new IllegalStateException("Item is already reserved or borrowed by another request");
        }

        // เปลี่ยนสถานะคำขอเป็น ACCEPTED
        request.approve(); 

        // ดึงสถานะ Item อัตโนมัติ (จะได้ ItemStatus.RESERVED)
        ItemStatus nextItemStatus = request.getStatus().getItemStatus();
        if (nextItemStatus != null) {
            item.setStatus(nextItemStatus);
        }

        itemRepository.save(item);
        return borrowRequestRepository.save(request);
    }

    // 4.เจ้าของปฏิเสธคำขอ
    @Transactional
    public BorrowRequest rejectRequest(String requestId, String ownerId) {
        return rejectRequest(requestId, ownerId, null);
    }

    @Transactional
    public BorrowRequest rejectRequest(String requestId, String ownerId, String reason) {
        return respondToRequest(requestId, ownerId, "reject", reason);
    }

    // 4.1 เจ้าของขอให้แก้ไขข้อมูล (Request Change)
    @Transactional
    public BorrowRequest requestChange(String requestId, String ownerId, String reason) {
        return respondToRequest(requestId, ownerId, "request_change", reason);
    }

    // 4.2 เจ้าของตอบกลับคำขอ (เลือกระหว่าง Request Change หรือ Permanent Reject)
    @Transactional
    public BorrowRequest respondToRequest(String requestId, String ownerId, String action, String reason) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

        if (ownerId == null || ownerId.isBlank() || !item.getOwnerId().equals(ownerId)) {
            throw new SecurityException("Unauthorized: You are not the owner of this item");
        }

        if (action == null || action.trim().isEmpty()) {
            throw new IllegalArgumentException("Action must not be empty");
        }

        String normalized = action.trim().toLowerCase();
        if ("request_change".equals(normalized) || "requestchange".equals(normalized)) {
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("Reason is required when requesting changes");
            }
            request.requestChange(reason);
        } else if ("reject".equals(normalized)) {
            request.reject(reason);
        } else {
            throw new IllegalArgumentException("Unsupported action: " + action + ". Supported actions: request_change, reject");
        }

        // ดึงสถานะ Item อัตโนมัติ
        ItemStatus nextItemStatus = request.getStatus().getItemStatus();
        if (nextItemStatus != null) {
            item.setStatus(nextItemStatus);
        }

        itemRepository.save(item);
        return borrowRequestRepository.save(request);
    }

    // 4.3 ผู้ยืมแก้ไขข้อมูลคำขอและส่งกลับมาให้เจ้าของพิจารณาใหม่
    @Transactional
    public BorrowRequest resubmitChangeRequest(String requestId, String borrowerId, BorrowRequestDto dto) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

        if (borrowerId == null || borrowerId.isBlank() || !request.getBorrowerId().equals(borrowerId)) {
            throw new SecurityException("Unauthorized: Only the requester can resubmit this request");
        }

        if (request.getStatus() != RequestStatus.CHANGE_REQUESTED && request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("Only requests with CHANGE_REQUESTED or PENDING status can be edited and resubmitted");
        }

        if (dto.getStartDate() != null && dto.getEndDate() != null && dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("The return date must not be before the date the loan began");
        }

        // ตรวจสอบกรอบเวลาที่เปิดให้ยืม (Available Date Range)
        if (dto.getStartDate() != null && item.getAvailableFrom() != null && dto.getStartDate().isBefore(item.getAvailableFrom())) {
            throw new IllegalArgumentException("Requested start date is before the item's available window: " + item.getAvailableFrom());
        }
        if (dto.getEndDate() != null && item.getAvailableUntil() != null && dto.getEndDate().isAfter(item.getAvailableUntil())) {
            throw new IllegalArgumentException("Requested end date is after the item's available window: " + item.getAvailableUntil());
        }

        if (dto.getStartDate() != null) request.setStartDate(dto.getStartDate());
        if (dto.getEndDate() != null) request.setEndDate(dto.getEndDate());
        if (dto.getReason() != null && !dto.getReason().trim().isEmpty()) {
            request.setReason(dto.getReason().trim());
        }

        request.setStatus(RequestStatus.PENDING);
        return borrowRequestRepository.save(request);
    } 

    @Transactional
    public BorrowRequest resetRequestToPending(String requestId, String ownerId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

        if (ownerId == null || ownerId.isBlank() || !item.getOwnerId().equals(ownerId)) {
            throw new SecurityException("Unauthorized: You are not the owner of this item");
        }

        request.resetToPending();

        // ตรวจสอบว่ายังมีคำขออื่นของไอเท็มนี้ที่ยัง ACCEPTED อยู่ไหม
        boolean hasOtherAccepted = borrowRequestRepository.findAll().stream()
                .anyMatch(r -> !r.getId().equals(requestId)
                        && r.getItemId().equals(item.getId())
                        && r.getStatus() == RequestStatus.ACCEPTED);

        if (!hasOtherAccepted && item.getStatus() == ItemStatus.RESERVED) {
            item.setStatus(ItemStatus.AVAILABLE);
        }

        itemRepository.save(item);
        return borrowRequestRepository.save(request);
    }

    // 5.ค้นหาคำขอทั้งหมดของผู้ยืม
    public List<BorrowRequest> getRequestsByBorrower(String borrowerId) {
        return borrowRequestRepository.findByBorrowerId(borrowerId);
    }

    // 6.ค้นหาคำขอยืมที่เข้ามาสำหรับสิ่งของทั้งหมดของเจ้าของ (Owner)
    public List<BorrowRequest> getRequestsByOwner(String ownerId) {
        List<String> ownerItemIds = itemRepository.findByOwnerId(ownerId)
                .stream()
                .map(Item::getId)
                .toList();
        if (ownerItemIds.isEmpty()) {
            return List.of();
        }
        return borrowRequestRepository.findAll()
                .stream()
                .filter(req -> ownerItemIds.contains(req.getItemId()))
                .toList();
    }

    // 7.ค้นหาคำขอทั้งหมดในระบบ
    public List<BorrowRequest> getAllRequests() {
        return borrowRequestRepository.findAll();
    }
}
