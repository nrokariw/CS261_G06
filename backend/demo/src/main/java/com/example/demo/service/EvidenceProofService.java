package com.example.demo.service;

import com.example.demo.constant.ProofType;
import com.example.demo.model.EvidenceProof;
import com.example.demo.repository.EvidenceProofRepository;
import com.example.demo.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EvidenceProofService {

    //define attributes
    private final EvidenceProofRepository evidenceProofRepository;
    private final TransactionRepository transactionRepository;

    //define constructor
    public EvidenceProofService(EvidenceProofRepository evidenceProofRepository,
                                TransactionRepository transactionRepository) {
        this.evidenceProofRepository = evidenceProofRepository;
        this.transactionRepository = transactionRepository;
    }

    // 1. เพิ่มหลักฐาน (เช่น รูปภาพสภาพของ) ผูกกับ Transaction
    public EvidenceProof addEvidenceProof(String transactionId, EvidenceProof proofData) {
        // ตรวจสอบว่า Transaction มีอยู่จริงไหม
        var transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found with id: " + transactionId));

        // ดึง ProofType อัตโนมัติ ของ TransactionStatus
        ProofType requiredProofType = transaction.getStatus().getProofType();

        if (requiredProofType == null) {
            throw new IllegalStateException("Current transaction status does not allow proof upload.");
        }

        // กำหนดประเภทของหลักฐานให้อัตโนมัติ (เช่น ถ้า ACTIVE จะได้ HANDOVER, ถ้า COMPLETED จะได้ RETURN)
        proofData.setProofType(requiredProofType);

        // กำหนด Transaction ID ให้กับหลักฐาน
        proofData.setTransactionId(transactionId);

        return evidenceProofRepository.save(proofData);
    }

    // 2. ดึงรายการหลักฐานทั้งหมดที่ผูกกับ Transaction นั้นๆ
    public List<EvidenceProof> getEvidencesByTransaction(String transactionId) {
        return evidenceProofRepository.findByTransactionId(transactionId);
    }
    
}
