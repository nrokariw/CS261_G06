package com.example.demo.controller;

import com.example.demo.model.BorrowRequest;
import com.example.demo.service.BorrowRequestService;

import org.springframework.cglib.core.Local;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import java.util.List;

@RestController 
@RequestMapping ("/api/borrow-requests")

public class BorrowRequestController {
    
    private final BorrowRequestService borrowService;

    public BorrowRequestController(BorrowRequestService borrowService) {
        this.borrowService = borrowService;
    }

    // 1. ส่งคำขอยืมไอเท็ม (รองรับ Client local time พร้อม UTC tag หรือ Offset)
    @PostMapping("/request")
    public BorrowRequest requestBorrow(
            @RequestParam String borrowerId,
            @RequestParam String itemId,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        
        // ใช้ OffsetDateTime.parse() เพื่อรองรับเครื่องหมาย 'Z' (UTC) หรือ Offset เช่น '+07:00'
        // แล้วแปลงให้เป็น LocalDateTime ในเขตเวลา UTC+0 ก่อนบันทึก
        LocalDateTime utcStartDate = OffsetDateTime.parse(startDate)
                .withOffsetSameInstant(ZoneOffset.UTC)
                .toLocalDateTime();
                
        LocalDateTime utcEndDate = OffsetDateTime.parse(endDate)
                .withOffsetSameInstant(ZoneOffset.UTC)
                .toLocalDateTime();

        return borrowService.requestBorrow(
            borrowerId, 
            itemId, 
            utcStartDate, 
            utcEndDate
        );
    }

    // 2. เจ้าของกดอนุมัติคำขอ
    @PostMapping("/{requestId}/approve")
    public BorrowRequest approveRequest(
            @PathVariable String requestId,
            @RequestParam String ownerId) {
        return borrowService.approveRequest(requestId, ownerId);
    }

    // 3. เจ้าของกดปฏิเสธคำขอ
    @PostMapping("/{requestId}/reject")
    public BorrowRequest rejectRequest(
            @PathVariable String requestId,
            @RequestParam String ownerId) {
        return borrowService.rejectRequest(requestId, ownerId);
    }

    // 4. ผู้ยืมกดยกเลิกคำขอ
    @PostMapping("/{requestId}/cancel")
    public BorrowRequest cancelRequest(@PathVariable String requestId) {
        return borrowService.cancelRequest(requestId);
    }

    // 5. ค้นหาคำขอทั้งหมดของผู้ยืม
    @GetMapping("/borrower/{borrowerId}")
    public List<BorrowRequest> getRequestsByBorrower(@PathVariable String borrowerId) {
        return borrowService.getRequestsByBorrower(borrowerId);
    }

}
