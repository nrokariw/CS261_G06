package com.example.demo.controller;

import com.example.demo.dto.BorrowRequestDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.service.BorrowRequestService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    //    และบันทึกข้อมูลด้วยสถานะ Pending และตอบกลับ 201 Created
    @PostMapping()
    public ResponseEntity<BorrowRequest> createBorrowRequest(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String borrowerId,
            @RequestBody BorrowRequestDto requestDto) {
        
        // ตัวอย่างกำหนด Mock ID หากยังไม่ได้ต่อระบบ Token จริงเต็มรูปแบบ
        if (borrowerId == null || borrowerId.isEmpty()) {
            borrowerId = "6400000002"; 
        }

        // ส่ง DTO เข้า Service ไปใช้ต่อได้ทันที (วันที่ถูก parse เป็น LocalDateTime ให้เรียบร้อยแล้ว)
        BorrowRequest savedRequest = borrowService.requestBorrow(borrowerId, requestDto);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedRequest);
    }

    // 2. เจ้าของกดอนุมัติคำขอ
    @PostMapping("/{requestId}/approve")
    public ResponseEntity<BorrowRequest> approveRequest(
            @PathVariable String requestId,
            @RequestParam String ownerId) {
        return ResponseEntity.ok(borrowService.approveRequest(requestId, ownerId));
    }

    // 3. เจ้าของกดปฏิเสธคำขอ
    @PostMapping("/{requestId}/reject")
    public ResponseEntity<BorrowRequest> rejectRequest(
            @PathVariable String requestId,
            @RequestParam String ownerId) {
        return ResponseEntity.ok(borrowService.rejectRequest(requestId, ownerId));
    }

    // 4. ผู้ยืมกดยกเลิกคำขอ
    @PostMapping("/{requestId}/cancel")
    public ResponseEntity<BorrowRequest> cancelRequest(@PathVariable String requestId) {
        return ResponseEntity.ok(borrowService.cancelRequest(requestId));
    }

    // 5. ค้นหาคำขอทั้งหมดของผู้ยืม
    @GetMapping("/borrower/{borrowerId}")
    public ResponseEntity<List<BorrowRequest>> getRequestsByBorrower(@PathVariable String borrowerId) {
        return ResponseEntity.ok(borrowService.getRequestsByBorrower(borrowerId));
    }

}
