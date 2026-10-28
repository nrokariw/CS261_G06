package com.example.demo.controller;

import com.example.demo.model.EvidenceProof;
import com.example.demo.service.EvidenceProofService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${app.api.evidence-path:/api/evidence}")
public class EvidenceProofController {

    private final EvidenceProofService evidenceProofService;

    public EvidenceProofController(EvidenceProofService evidenceProofService) {
        this.evidenceProofService = evidenceProofService;
    }

    // อัปโหลด/บันทึกหลักฐานสำหรับ Transaction นั้นๆ
    @PostMapping("/transaction/{transactionId}")
    public EvidenceProof addEvidenceProof(
            @PathVariable String transactionId,
            @RequestBody EvidenceProof proofData) {
        return evidenceProofService.addEvidenceProof(transactionId, proofData);
    }
}
