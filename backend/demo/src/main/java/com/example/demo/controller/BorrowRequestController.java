package com.example.demo.controller;

import com.example.demo.dto.BorrowRequestDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.service.BorrowRequestService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.cglib.core.Local;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import java.util.List;
import java.util.Map;

@RestController 
@RequestMapping ({"${app.api.requests-path:/api/requests}", "/api/borrow-requests"})

public class BorrowRequestController {
    
    private final BorrowRequestService borrowService;

    public BorrowRequestController(BorrowRequestService borrowService) {
        this.borrowService = borrowService;
    }

    private LocalDateTime parseToUtcDateTime(String dateStr, boolean endOfDay) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return LocalDateTime.now(ZoneOffset.UTC);
        }
        String trimmed = dateStr.trim();
        try {
            return OffsetDateTime.parse(trimmed)
                    .withOffsetSameInstant(ZoneOffset.UTC)
                    .toLocalDateTime();
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(trimmed);
            } catch (Exception ignored2) {
                LocalDate localDate = LocalDate.parse(trimmed.substring(0, 10));
                return endOfDay ? localDate.atTime(23, 59, 59) : localDate.atStartOfDay();
            }
        }
    }

    @GetMapping
    public List<BorrowRequest> getAllRequests(@RequestParam(required = false) String ownerId) {
        if (ownerId != null && !ownerId.trim().isEmpty()) {
            return borrowService.getRequestsByOwner(ownerId.trim());
        }
        return borrowService.getAllRequests();
    }

    // ดึงรายการคำขอยืมที่เข้ามาหาเจ้าของสิ่งของ (US-05.1)
    @GetMapping("/owner/{ownerId}")
    public List<BorrowRequest> getRequestsByOwner(@PathVariable String ownerId) {
        return borrowService.getRequestsByOwner(ownerId);
    }

    @PostMapping
    public ResponseEntity<BorrowRequest> createRequest(
        @RequestHeader(value = "Authorization", required = false) String authHeader,
        @RequestBody Map<String, String> payload) {
            
        String borrowerId = payload.get("borrowerId");
        String itemId = payload.get("itemId");
        String startStr = payload.getOrDefault("borrowDate", payload.get("startDate"));
        String endStr = payload.getOrDefault("returnDate", payload.get("endDate"));
        String reason = payload.get("reason");

        LocalDateTime utcStartDate = parseToUtcDateTime(startStr, false);
        LocalDateTime utcEndDate = parseToUtcDateTime(endStr, true);

        BorrowRequestDto dto = new BorrowRequestDto();
        dto.setItemId(itemId);
        dto.setStartDate(utcStartDate);
        dto.setEndDate(utcEndDate);
        dto.setReason(reason);

        BorrowRequest savedRequest = borrowService.requestBorrow(borrowerId, dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedRequest);
    }

    // 1. ส่งคำขอยืมไอเท็ม (รองรับ Client local time พร้อม UTC tag หรือ Offset)
    //    และบันทึกข้อมูลด้วยสถานะ Pending และตอบกลับ 201 Created
    @PostMapping("/request")
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
