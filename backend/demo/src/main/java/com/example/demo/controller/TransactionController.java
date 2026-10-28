package com.example.demo.controller;

import com.example.demo.model.EvidenceProof;
import com.example.demo.model.Transaction;
import com.example.demo.service.EvidenceProofService;
import com.example.demo.service.TransactionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController 
@RequestMapping ("${app.api.transactions-path:/api/transactions}")

public class TransactionController {

    private final TransactionService transactionService;
    private final EvidenceProofService evidenceProofService;

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

}
