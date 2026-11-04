package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.dto.BorrowRequestDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BorrowRequestService {

    //define attributes
    private final BorrowRequestRepository borrowRequestRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;

    //define constructor
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
        
        // 1) เช็คว่าได้ยืมของตัวเองไหม (โยน IllegalArgumentException -> Handler จะแปลงเป็น 400 Bad Request)
        if (item.getOwnerId().equals(borrowerId)) {
            throw new IllegalArgumentException("Item cannot borrow your own belongings");
        }

        // 2) เช็คว่าไอเท็มนี้พร้อมให้ยืมไหม (โยน IllegalStateException -> Handler จะแปลงเป็น 409 Conflict)
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new IllegalStateException("Item is not available for borrow");
        }

        // 3) เช็คว่าวันที่คืนไม่ได้อยู่ก่อนวันที่เริ่มยืมใช่ไหม (โยน IllegalArgumentException -> แปลงเป็น 400 Bad Request)
        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new IllegalArgumentException("The return date must not be before the date the loan began");
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
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Borrow Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

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

    // 3.1. เจ้าของกดอนุมัติคำขอ
    @Transactional
    public BorrowRequest approveRequest(String requestId, String ownerId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

        // ตรวจสอบว่าคนที่กดอนุมัติ เป็นเจ้าของไอเท็มชิ้นนี้จริงๆ หรือไม่ (Security Check)
        if (ownerId != null && !ownerId.isEmpty() && !item.getOwnerId().equals(ownerId)) {
            throw new SecurityException("Unauthorized: You are not the owner of this item");
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

    // 3.2. เจ้าของปฏิเสธคำขอ
    @Transactional
    public BorrowRequest rejectRequest(String requestId, String ownerId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found: " + request.getItemId()));

        if (ownerId != null && !ownerId.isEmpty() && !item.getOwnerId().equals(ownerId)) {
            throw new SecurityException("Unauthorized: You are not the owner of this item");
        }

        // เปลี่ยนสถานะคำขอเป็น REJECTED
        request.reject();

        // ดึงสถานะ Item อัตโนมัติ (จะได้ ItemStatus.AVAILABLE)
        ItemStatus nextItemStatus = request.getStatus().getItemStatus();
        if (nextItemStatus != null) {
            item.setStatus(nextItemStatus);
        }

        itemRepository.save(item);
        return borrowRequestRepository.save(request);
    } 

    // 4. รีเซ็ตสถานะของคำขอยืมกลับไปเป็น "รอนุมัติ" และ ปรับสถานะสิ่งของที่เกี่ยวข้องให้กลับมา "พร้อมใช้งาน" 
    @Transactional
    public BorrowRequest resetRequestToPending(String requestId, String ownerId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (ownerId != null && !ownerId.isEmpty() && !item.getOwnerId().equals(ownerId)) {
            throw new SecurityException("Unauthorized: You are not the owner of this item");
        }

        request.resetToPending();
        item.setStatus(ItemStatus.AVAILABLE);

        itemRepository.save(item);
        return borrowRequestRepository.save(request);
    }

    // 5.1. ค้นหาคำขอทั้งหมดของผู้ยืม
    public List<BorrowRequest> getRequestsByBorrower(String borrowerId) {
        return borrowRequestRepository.findByBorrowerId(borrowerId);
    }

    // 5.2. ค้นหาคำขอยืมที่เข้ามาสำหรับสิ่งของทั้งหมดของเจ้าของ (Owner)
    public List<BorrowRequest> getRequestsByOwner(String ownerId) {
        List<String> ownerItemIds = itemRepository.findByOwnerId(ownerId)
                .stream()
                .map(item -> item.getId())
                .toList();
        if (ownerItemIds.isEmpty()) {
            return List.of();
        }
        return borrowRequestRepository.findAll()
                .stream()
                .filter(req -> ownerItemIds.contains(req.getItemId()))
                .toList();
    }

    // 5.3. ค้นหาคำขอทั้งหมดในระบบ
    public List<BorrowRequest> getAllRequests() {
        return borrowRequestRepository.findAll();
    }
}
