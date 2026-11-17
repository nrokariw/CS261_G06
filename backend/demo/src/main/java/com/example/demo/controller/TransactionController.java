package com.example.demo.controller;

import com.example.demo.dto.HandoverRequestDto;
import com.example.demo.dto.ReturnRequestDto;
import com.example.demo.dto.LoanEvidenceResponseDto;
import com.example.demo.model.EvidenceProof;
import com.example.demo.model.Transaction;
import com.example.demo.service.EvidenceProofService;
import com.example.demo.service.TransactionService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController 
@RequestMapping ("${app.api.transactions-path:/api/transactions}")

public class TransactionController {

    //define attributes
    private final TransactionService transactionService;
    private final EvidenceProofService evidenceProofService;

    //define constructor
    public TransactionController(TransactionService transactionService,
                                EvidenceProofService evidenceProofService) {
        this.transactionService = transactionService;
        this.evidenceProofService = evidenceProofService;
    }

    // 1. เริ่มต้น Transaction การยืม
    @PostMapping("/start/{requestId}")
    public Transaction startTransaction(@PathVariable String requestId) {
        return transactionService.createTransactionFromRequest(requestId);
    }

    // 2. บันทึกการคืนสินค้า (Complete Transaction)
    @PostMapping("/{transactionId}/complete")
    public Transaction completeTransaction(@PathVariable String transactionId) {
        return transactionService.completeTransaction(transactionId);
    }

    // 3. แนบหลักฐานการยืม/คืน (Evidence Proof)
    @PostMapping("/{transactionId}/evidence")
    public EvidenceProof addEvidence(
            @PathVariable String transactionId,
            @RequestBody EvidenceProof proofData) {
        return evidenceProofService.addEvidenceProof(transactionId, proofData);
    }

    // 4. ดึงประวัติธุรกรรมของผู้ยืม
    @GetMapping("/borrower/{borrowerId}")
    public List<Transaction> getTransactionsByBorrower(
            @PathVariable String borrowerId,
            Authentication authentication) {
        String currentUserId = requireAuthenticatedUserId(authentication);
        if (!currentUserId.equals(borrowerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden: You can only view your own transactions");
        }
        return transactionService.getTransactionsByBorrower(borrowerId);
    }

    // 5. ดึงประวัติธุรกรรมของไอเท็ม
    @GetMapping("/item/{itemId}")
    public List<Transaction> getTransactionsByItem(@PathVariable String itemId) {
        return transactionService.getTransactionsByItem(itemId);
    }

    /**
     * T-6.2: Endpoint สำหรับบันทึกหลักฐานการส่งมอบสิ่งของ
     */
    @PostMapping(value = "/{requestId}/handover-evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Transaction> submitHandoverEvidence(
            @PathVariable("requestId") String requestId,
            Authentication authentication,
            @ModelAttribute HandoverRequestDto requestDto) {

        String authenticatedStudentId = requireAuthenticatedUserId(authentication);
        Transaction savedTransaction = transactionService.createHandoverEvidence(requestId, authenticatedStudentId, requestDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedTransaction);
    }

    // T-7.1: POST API สำหรับบันทึกหลักฐานการส่งคืนสิ่งของ
    @PostMapping(value = "/request/{requestId}/return-evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Transaction> submitReturnEvidence(
            @PathVariable String requestId,
            Authentication authentication,
            @ModelAttribute ReturnRequestDto requestDto) {

        String authenticatedStudentId = requireAuthenticatedUserId(authentication);
        Transaction updatedTransaction = transactionService.submitReturnEvidence(requestId, authenticatedStudentId, requestDto);
        return ResponseEntity.ok(updatedTransaction);
    }

    // T-8.1: GET API สำหรับเรียกดูประวัติและหลักฐานการยืม-คืนสิ่งของ พร้อมจำกัดสิทธิ์เฉพาะคู่สัญญา (รองรับทั้ง requestId และ transactionId)
    @GetMapping("/{id}/evidence")
    public ResponseEntity<LoanEvidenceResponseDto> getLoanEvidence(
            @PathVariable("id") String id,
            Authentication authentication) {

        String userId = requireAuthenticatedUserId(authentication);
        LoanEvidenceResponseDto responseDto = transactionService.getLoanEvidenceDetail(id, userId);
        return ResponseEntity.ok(responseDto);
    }

    private String requireAuthenticatedUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || authentication.getName().isBlank()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }
        return authentication.getName();
    }
}