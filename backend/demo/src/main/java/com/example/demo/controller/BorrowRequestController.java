package com.example.demo.controller;

import com.example.demo.model.BorrowRequest;
import com.example.demo.service.BorrowRequestService;
import org.springframework.web.bind.annotation.*;
import org.joda.time.DateTime;

import java.util.List;

@RestController 
@RequestMapping ("/api/borrow-requests")

public class BorrowRequestController {
    
    private final BorrowRequestService borrowService;

    public BorrowRequestController(BorrowRequestService borrowService) {
        this.borrowService = borrowService;
    }

    // 1. ส่งคำขอยืมไอเท็ม
    @PostMapping("/request")
    public BorrowRequest requestBorrow(
            @RequestParam String borrowerId,
            @RequestParam String itemId,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        
        return borrowService.requestBorrow(
            borrowerId, 
            itemId, 
            DateTime.parse(startDate), 
            DateTime.parse(endDate)
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
