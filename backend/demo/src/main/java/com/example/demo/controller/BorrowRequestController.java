package com.example.demo.controller;

import com.example.demo.model.BorrowRequest;
import com.example.demo.service.BorrowRequestService;

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
    public List<BorrowRequest> getAllRequests() {
        return borrowService.getAllRequests();
    }

    @PostMapping
    public BorrowRequest createRequest(@RequestBody Map<String, String> payload) {
        String borrowerId = payload.get("borrowerId");
        String itemId = payload.get("itemId");
        String startStr = payload.getOrDefault("borrowDate", payload.get("startDate"));
        String endStr = payload.getOrDefault("returnDate", payload.get("endDate"));
        String reason = payload.get("reason");

        LocalDateTime utcStartDate = parseToUtcDateTime(startStr, false);
        LocalDateTime utcEndDate = parseToUtcDateTime(endStr, true);

        return borrowService.requestBorrow(borrowerId, itemId, utcStartDate, utcEndDate, reason);
    }

    // 1. ส่งคำขอยืมไอเท็ม (รองรับ Client local time พร้อม UTC tag หรือ Offset)
    @PostMapping("/request")
    public BorrowRequest requestBorrow(
            @RequestParam String borrowerId,
            @RequestParam String itemId,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String reason) {
        
        // ใช้ OffsetDateTime.parse() เพื่อรองรับเครื่องหมาย 'Z' (UTC) หรือ Offset เช่น '+07:00'
        // แล้วแปลงให้เป็น LocalDateTime ในเขตเวลา UTC+0 ก่อนบันทึก
        LocalDateTime utcStartDate = parseToUtcDateTime(startDate, false);
                
        LocalDateTime utcEndDate = parseToUtcDateTime(endDate, true);

        return borrowService.requestBorrow(
            borrowerId, 
            itemId, 
            utcStartDate, 
            utcEndDate,
            reason
        );
    }

    @RequestMapping(value = "/{requestId}/status", method = {RequestMethod.PATCH, RequestMethod.POST})
    public BorrowRequest updateRequestStatus(
            @PathVariable String requestId,
            @RequestParam(required = false) String ownerId,
            @RequestBody(required = false) Map<String, String> body) {
        String resolvedOwnerId = ownerId != null ? ownerId : (body != null ? body.get("ownerId") : null);
        String status = body != null ? body.getOrDefault("status", body.getOrDefault("action", "")) : "";
        String upper = status.toUpperCase();
        if ("ACCEPTED".equals(upper) || "ACCEPT".equals(upper) || "APPROVE".equals(upper)) {
            return borrowService.approveRequest(requestId, resolvedOwnerId);
        }
        if ("REJECTED".equals(upper) || "REJECT".equals(upper)) {
            return borrowService.rejectRequest(requestId, resolvedOwnerId);
        }
        if ("PENDING".equals(upper) || "RESET".equals(upper)) {
            return borrowService.resetRequestToPending(requestId, resolvedOwnerId);
        }
        if ("CANCELLED".equals(upper) || "CANCEL".equals(upper)) {
            return borrowService.cancelRequest(requestId);
        }
        return borrowService.resetRequestToPending(requestId, resolvedOwnerId);
    }

    // 2. เจ้าของกดอนุมัติคำขอ
    @PostMapping("/{requestId}/approve")
    public BorrowRequest approveRequest(
            @PathVariable String requestId,
            @RequestParam(required = false) String ownerId) {
        return borrowService.approveRequest(requestId, ownerId);
    }

    // 3. เจ้าของกดปฏิเสธคำขอ
    @PostMapping("/{requestId}/reject")
    public BorrowRequest rejectRequest(
            @PathVariable String requestId,
            @RequestParam(required = false) String ownerId) {
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
