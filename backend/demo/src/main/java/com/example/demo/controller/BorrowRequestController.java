package com.example.demo.controller;

import com.example.demo.dto.BorrowRequestDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.service.BorrowRequestService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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

    private String requireAuthenticatedStudentId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || authentication.getName().isBlank()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }
        return authentication.getName();
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
            Authentication authentication,
            @RequestBody Map<String, String> payload) {
            
        String authenticatedBorrowerId = requireAuthenticatedStudentId(authentication);
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

        BorrowRequest savedRequest = borrowService.requestBorrow(authenticatedBorrowerId, dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedRequest);
    }

    // 1. ส่งคำขอยืมไอเท็ม (ดึง borrowerId จาก JWT SecurityContext เท่านั้น)
    @PostMapping("/request")
    public ResponseEntity<BorrowRequest> createBorrowRequest(
            Authentication authentication,
            @RequestBody BorrowRequestDto requestDto) {
        
        String authenticatedBorrowerId = requireAuthenticatedStudentId(authentication);
        BorrowRequest savedRequest = borrowService.requestBorrow(authenticatedBorrowerId, requestDto);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedRequest);
    }

    // 2. เจ้าของกดอนุมัติคำขอ (ดึง ownerId จาก JWT SecurityContext เท่านั้น)
    @PostMapping("/{requestId}/approve")
    public ResponseEntity<BorrowRequest> approveRequest(
            @PathVariable String requestId,
            Authentication authentication) {
        String authenticatedOwnerId = requireAuthenticatedStudentId(authentication);
        return ResponseEntity.ok(borrowService.approveRequest(requestId, authenticatedOwnerId));
    }

    // 3. เจ้าของกดปฏิเสธคำขอ (ดึง ownerId จาก JWT SecurityContext เท่านั้น)
    @PostMapping("/{requestId}/reject")
    public ResponseEntity<BorrowRequest> rejectRequest(
            @PathVariable String requestId,
            Authentication authentication) {
        String authenticatedOwnerId = requireAuthenticatedStudentId(authentication);
        return ResponseEntity.ok(borrowService.rejectRequest(requestId, authenticatedOwnerId));
    }

    // 3.1 เจ้าของกดเปลี่ยนกลับเป็นรอพิจารณา (Reset to pending)
    @PostMapping({"/{requestId}/reset", "/{requestId}/pending"})
    public ResponseEntity<BorrowRequest> resetRequestToPending(
            @PathVariable String requestId,
            Authentication authentication) {
        String authenticatedOwnerId = requireAuthenticatedStudentId(authentication);
        return ResponseEntity.ok(borrowService.resetRequestToPending(requestId, authenticatedOwnerId));
    }

    // 4. ผู้ยืมกดยกเลิกคำขอ (ดึง borrowerId จาก JWT SecurityContext เท่านั้น)
    @PostMapping("/{requestId}/cancel")
    public ResponseEntity<BorrowRequest> cancelRequest(
            @PathVariable String requestId,
            Authentication authentication) {
        String authenticatedBorrowerId = requireAuthenticatedStudentId(authentication);
        return ResponseEntity.ok(borrowService.cancelRequest(requestId, authenticatedBorrowerId));
    }

    // 5. ค้นหาคำขอทั้งหมดของผู้ยืม
    @GetMapping("/borrower/{borrowerId}")
    public ResponseEntity<List<BorrowRequest>> getRequestsByBorrower(@PathVariable String borrowerId) {
        return ResponseEntity.ok(borrowService.getRequestsByBorrower(borrowerId));
    }

}
