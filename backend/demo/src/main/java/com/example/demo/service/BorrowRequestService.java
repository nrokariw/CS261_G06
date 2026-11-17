package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.LendOfferStatus;
import com.example.demo.constant.RequestStatus;
import com.example.demo.constant.WantedPostStatus;
import com.example.demo.dto.BorrowRequestDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.LendOffer;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.LendOfferRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WantedPostRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BorrowRequestService {

    //define attributes
    private final BorrowRequestRepository borrowRequestRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final LendOfferRepository lendOfferRepository;
    private final WantedPostRepository wantedPostRepository;

    //define constructor
    public BorrowRequestService(BorrowRequestRepository borrowRequestRepository,
                                ItemRepository itemRepository,
                                UserRepository userRepository) {
        this(borrowRequestRepository, itemRepository, userRepository, null, null);
    }

    @Autowired
    public BorrowRequestService(BorrowRequestRepository borrowRequestRepository,
                                ItemRepository itemRepository,
                                UserRepository userRepository,
                                LendOfferRepository lendOfferRepository,
                                WantedPostRepository wantedPostRepository) {
        this.borrowRequestRepository = borrowRequestRepository;
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.lendOfferRepository = lendOfferRepository;
        this.wantedPostRepository = wantedPostRepository;
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

        // ตรวจสอบว่าผู้ยืมคนนี้เคยถูก REJECT ในสิ่งของชิ้นนี้หรือไม่ (Permanent Block จนกว่าเจ้าของจะ Reset)
        List<BorrowRequest> existingRequests = borrowRequestRepository.findByItemIdAndBorrowerId(dto.getItemId(), borrowerId);
        boolean isBlocked = existingRequests.stream()
                .anyMatch(r -> r.getStatus() == RequestStatus.REJECTED);
        if (isBlocked) {
            throw new SecurityException("You have been blocked from requesting this item by the owner");
        }

        // 2) เช็คว่าไอเท็มนี้พร้อมให้ยืมไหม (โยน IllegalStateException -> Handler จะแปลงเป็น 409 Conflict)
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new IllegalStateException("Item is not available for borrow");
        }

        // 3) เช็คว่าวันที่คืนไม่ได้อยู่ก่อนวันที่เริ่มยืมใช่ไหม (โยน IllegalArgumentException -> แปลงเป็น 400 Bad Request)
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

    // 3.1. เจ้าของกดอนุมัติคำขอ
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
        BorrowRequest savedRequest = borrowRequestRepository.save(request);

        // Sync pending lend offers for this item + same requester: accept matching offer and fulfill post
        if (lendOfferRepository != null && wantedPostRepository != null) {
            for (LendOffer offer : lendOfferRepository.findByOfferedItemIdAndStatus(item.getId(), LendOfferStatus.PENDING)) {
                wantedPostRepository.findById(offer.getWantedPostId()).ifPresent(post -> {
                    if (post.getDeletedAt() == null && post.getRequesterId().equals(request.getBorrowerId())) {
                        offer.setStatus(LendOfferStatus.ACCEPTED);
                        lendOfferRepository.save(offer);
                        if (post.getStatus() == WantedPostStatus.OPEN) {
                            post.setStatus(WantedPostStatus.FULFILLED);
                            wantedPostRepository.save(post);
                        }
                        for (LendOffer postOffer : lendOfferRepository.findByWantedPostIdOrderByCreatedAtDesc(post.getId())) {
                            if (!postOffer.getId().equals(offer.getId()) && postOffer.getStatus() == LendOfferStatus.PENDING) {
                                postOffer.setStatus(LendOfferStatus.REJECTED);
                                lendOfferRepository.save(postOffer);
                            }
                        }
                    }
                });
            }
        }

        return savedRequest;
    }

    // 3.2. เจ้าของปฏิเสธคำขอ
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
        BorrowRequest savedRequest = borrowRequestRepository.save(request);

        // Sync-reject any pending lend offer for the same item and requester when owner rejects
        if ("reject".equals(normalized) && lendOfferRepository != null && wantedPostRepository != null) {
            for (LendOffer offer : lendOfferRepository.findByOfferedItemIdAndStatus(item.getId(), LendOfferStatus.PENDING)) {
                wantedPostRepository.findById(offer.getWantedPostId()).ifPresent(post -> {
                    if (post.getDeletedAt() == null && post.getRequesterId().equals(request.getBorrowerId())) {
                        offer.setStatus(LendOfferStatus.REJECTED);
                        lendOfferRepository.save(offer);
                    }
                });
            }
        }

        return savedRequest;
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

    // 4. รีเซ็ตสถานะของคำขอยืมกลับไปเป็น "รอนุมัติ" และ ปรับสถานะสิ่งของที่เกี่ยวข้องให้กลับมา "พร้อมใช้งาน" 
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

        if (lendOfferRepository != null && wantedPostRepository != null) {
            List<LendOffer> acceptedOffers = lendOfferRepository.findByOfferedItemIdAndStatus(
                    item.getId(),
                    LendOfferStatus.ACCEPTED
            );
            for (LendOffer offer : acceptedOffers) {
                wantedPostRepository.findById(offer.getWantedPostId()).ifPresent(post -> {
                    if (post.getDeletedAt() == null && post.getRequesterId().equals(request.getBorrowerId())) {
                        offer.setStatus(LendOfferStatus.PENDING);
                        lendOfferRepository.save(offer);
                        if (post.getStatus() == WantedPostStatus.FULFILLED) {
                            post.setStatus(WantedPostStatus.OPEN);
                            wantedPostRepository.save(post);
                        }
                    }
                });
            }
        }

        itemRepository.save(item);
        return borrowRequestRepository.save(request);
    }

    // 5.1. ค้นหาคำขอทั้งหมดของผู้ยืม
    public List<BorrowRequest> getRequestsByBorrower(String borrowerId) {
        return populateMetadata(borrowRequestRepository.findByBorrowerId(borrowerId));
    }

    // 5.2. ค้นหาคำขอยืมที่เข้ามาสำหรับสิ่งของทั้งหมดของเจ้าของ (Owner)
    public List<BorrowRequest> getRequestsByOwner(String ownerId) {
        List<String> ownerItemIds = itemRepository.findByOwnerId(ownerId)
                .stream()
                .map(Item::getId)
                .toList();
        if (ownerItemIds.isEmpty()) {
            return List.of();
        }
        return populateMetadata(
                borrowRequestRepository.findAll()
                        .stream()
                        .filter(req -> ownerItemIds.contains(req.getItemId()))
                        .toList()
        );
    }

    // 5.3. ค้นหาคำขอทั้งหมดในระบบ
    public List<BorrowRequest> getAllRequests() {
        return populateMetadata(borrowRequestRepository.findAll());
    }

    private List<BorrowRequest> populateMetadata(List<BorrowRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return requests;
        }

        Set<String> itemIds = requests.stream()
                .map(BorrowRequest::getItemId)
                .filter(Objects::nonNull)
                .filter(id -> !id.isBlank())
                .collect(Collectors.toSet());

        Map<String, Item> itemMap = itemIds.isEmpty()
                ? Map.of()
                : itemRepository.findAllById(itemIds).stream()
                        .collect(Collectors.toMap(Item::getId, item -> item, (a, b) -> a));

        Set<String> userIds = new java.util.HashSet<>();
        for (BorrowRequest req : requests) {
            if (req.getBorrowerId() != null && !req.getBorrowerId().isBlank()) {
                userIds.add(req.getBorrowerId());
            }
            Item item = itemMap.get(req.getItemId());
            if (item != null && item.getOwnerId() != null && !item.getOwnerId().isBlank()) {
                userIds.add(item.getOwnerId());
            }
        }

        Map<String, String> userNameMap = userIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(
                                User::getStudentId,
                                user -> (user.getFullName() != null && !user.getFullName().isBlank())
                                        ? user.getFullName()
                                        : (user.getUsername() != null ? user.getUsername() : user.getStudentId()),
                                (a, b) -> a
                        ));

        for (BorrowRequest req : requests) {
            Item item = itemMap.get(req.getItemId());
            if (item != null) {
                req.setOwnerId(item.getOwnerId());
                req.setItemName(item.getTitle());
                req.setItemImage(item.getImageUrl());
                req.setOwnerName(userNameMap.getOrDefault(item.getOwnerId(), item.getOwnerId()));
            }
            if (req.getBorrowerId() != null) {
                req.setBorrowerName(userNameMap.getOrDefault(req.getBorrowerId(), req.getBorrowerId()));
            }
        }
        return requests;
    }
}
