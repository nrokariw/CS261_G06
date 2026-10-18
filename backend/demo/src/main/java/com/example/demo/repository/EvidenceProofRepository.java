package com.example.demo.repository;

import com.example.demo.model.EvidenceProof;
import com.example.demo.constant.ProofType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EvidenceProofRepository extends JpaRepository<EvidenceProof, String> {
    
    // ค้นหาหลักฐานทั้งหมดที่ผูกอยู่กับ Transaction นั้นๆ (เช่น ตอนรับของ หรือตอนคืนของ)
    List<EvidenceProof> findByTransactionId(String transactionId);
    
    // ค้นหาหลักฐานตามประเภท (เช่น ดึงเฉพาะรูปถ่ายตอนรับของ หรือตอนคืนของ)
    List<EvidenceProof> findByProofType(ProofType proofType);
}
