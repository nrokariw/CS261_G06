package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.UserRepository;

import org.springframework.cglib.core.Local;
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
    public BorrowRequest requestBorrow(String borrowerId, String itemId, LocalDateTime startDate, LocalDateTime endDate) {
        // ตรวจสอบว่ามี User และ Item อยู่จริงไหม
        User borrower = userRepository.findById(borrowerId)
                .orElseThrow(() -> new RuntimeException("Borrower not found"));
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item not found"));
        
        //เช็คว่าไอเท็มนี้พร้อมให้ยืมไหม
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new RuntimeException("Item is not available for borrow");
        }

        // เรียกใช้ฟังก์ชัน requestBorrow จาก User Model (ข้างในกำหนด createdAt เป็น UTC+0 แล้ว)
        BorrowRequest request = borrower.requestBorrow(itemId, startDate, endDate);
        request.setId(java.util.UUID.randomUUID().toString());

        return borrowRequestRepository.save(request);
    }

    // 2. ผู้ยืมยกเลิกคำขอยืม 
    @Transactional
    public BorrowRequest cancelRequest(String requestId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Borrow Request not found"));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));

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
                .orElseThrow(() -> new RuntimeException("Request not found"));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));

        // ตรวจสอบว่าคนที่กดอนุมัติ เป็นเจ้าของไอเท็มชิ้นนี้จริงๆ หรือไม่ (Security Check)
        if (!item.getOwnerId().equals(ownerId)) {
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

    // 4.เจ้าของปฏิเสธคำขอ
    @Transactional
    public BorrowRequest rejectRequest(String requestId, String ownerId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));

        if (!item.getOwnerId().equals(ownerId)) {
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

    // 5.ค้นหาคำขอทั้งหมดของผู้ยืม
    public List<BorrowRequest> getRequestsByBorrower(String borrowerId) {
        return borrowRequestRepository.findByBorrowerId(borrowerId);
    }
}
