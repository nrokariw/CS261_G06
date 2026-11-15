package com.example.demo.controller;

import com.example.demo.model.EvidenceProof;
import com.example.demo.model.Transaction;
import com.example.demo.service.EvidenceProofService;
import com.example.demo.service.TransactionService;

import org.springframework.http.HttpStatus;
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
    
    // Helper method ลดโค้ดตรวจสอบซ้ำซ้อน
    private void validateAuthHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }
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
    public List<Transaction> getTransactionsByBorrower(@PathVariable String borrowerId) {
        return transactionService.getTransactionsByBorrower(borrowerId);
    }

    // 5. ดึงประวัติธุรกรรมของไอเท็ม
    @GetMapping("/item/{itemId}")
    public List<Transaction> getTransactionsByItem(@PathVariable String itemId) {
        return transactionService.getTransactionsByItem(itemId);
    }

    // T-7.1: POST API สำหรับบันทึกหลักฐานการส่งคืนสิ่งของ
    @PostMapping(value = "/request/{requestId}/return-evidence", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Transaction> submitReturnEvidence(
            @PathVariable String requestId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            Authentication authentication,
            @ModelAttribute com.example.demo.dto.ReturnRequestDto requestDto) {

        // เรียกใช้งาน Service บันทึกหลักฐานและอัปเดตสถานะ
        validateAuthHeader(authHeader);
        String authenticatedStudentId = authentication.getName();
        Transaction updatedTransaction = transactionService.submitReturnEvidence(requestId, authenticatedStudentId, requestDto);

        return ResponseEntity.status(org.springframework.http.HttpStatus.OK).body(updatedTransaction);
    }

}