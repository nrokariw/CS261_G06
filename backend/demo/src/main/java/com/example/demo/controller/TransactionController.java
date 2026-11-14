package com.example.demo.controller;

import com.example.demo.dto.HandoverRequestDto;
import com.example.demo.model.EvidenceProof;
import com.example.demo.model.Transaction;
import com.example.demo.service.EvidenceProofService;
import com.example.demo.service.TransactionService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    public List<Transaction> getTransactionsByBorrower(@PathVariable String borrowerId) {
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
    @PostMapping(value = "/{requestId}/handover-evidence", consumes = {"multipart/form-data"})
    public ResponseEntity<Transaction> submitHandoverEvidence(
            @PathVariable("requestId") String requestId,
            Authentication authentication,
            @ModelAttribute HandoverRequestDto requestDto) {

        // 1. ตรวจสอบการยืนยันตัวตนจาก Spring Security Context (401 Unauthorized ถ้ายังไม่ได้ Login)
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: กรุณาเข้าสู่ระบบก่อนทำรายการ");
        }

        // ดึง User ID (Username หรือ Subject จาก JWT ที่ถูกเซ็ตไว้ใน SecurityContext)
        String currentUserId = authentication.getName();

        // 2. เรียกใช้ Service ดำเนินการ Business Logic และ Transaction
        Transaction savedTransaction = transactionService.createHandoverEvidence(requestId, currentUserId, requestDto);

        // 3. ตอบกลับ 201 Created เมื่อทำรายการสำเร็จ
        return ResponseEntity.status(HttpStatus.CREATED).body(savedTransaction);
    }

}
