package com.example.demo.model;

import com.example.demo.constant.ProofType;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;

@Entity 
public class EvidenceProof {
    @Id 
    //define attributes
    private String id;
    private String transactionId;
    private String uploaderId;
    @Enumerated(EnumType.STRING)
    private ProofType proofType;
    private String imageUrl;
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String note;
    @Column(columnDefinition = "DATETIME2")
    private LocalDateTime capturedAt;

    // สั่งให้สุ่มสร้าง UUID และกำหนดเวลาเป็น UTC+0 อัตโนมัติหากไม่ได้ระบุมา
    @PrePersist
    protected void onCreate() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = UUID.randomUUID().toString(); // สร้าง UUID 36 หลัก
        }
        if (this.capturedAt == null) {
            this.capturedAt = LocalDateTime.now(ZoneOffset.UTC); // บันทึกเวลาเป็น UTC+0 เสมอ
        }
    }
    
    /**
     * Default constructor สำหรับสร้างออบเจ็กต์ EvidenceProof เปล่า
     */
    public EvidenceProof() { }
    
    /**
     * Constructor สำหรับสร้างและกำหนดค่าเริ่มต้นให้กับหลักฐานการยืมทั้งหมด
     * 
     * @param id            รหัสประจำตัวหลักฐาน (Evidence ID)
     * @param transactionId รหัสประจำตัวการทำรายการ (Transaction ID) 
     * @param uploaderId    รหัสประจำตัวของผู้อัปโหลด (Uploader ID) 
     * @param proofType     ประเภทของหลักฐาน (เช่น HANDOVER, RETURN)
     * @param imageUrl      ลิงก์หรือที่อยู่ของรูปภาพหลักฐานที่อัปโหลด
     * @param note          หมายเหตุเพิ่มเติม
     * @param capturedAt    วันที่และเวลาที่จับภาพหลักฐาน
     */
    public EvidenceProof(String id, String transactionId, String uploaderId, ProofType proofType, String imageUrl, String note, LocalDateTime capturedAt) {
        this.id = id;
        this.transactionId = transactionId;
        this.uploaderId = uploaderId;
        this.proofType = proofType;
        this.imageUrl = imageUrl;
        this.note = note;
        this.capturedAt = capturedAt != null ? capturedAt : LocalDateTime.now(ZoneOffset.UTC);
    }

    //define getters and setters
    public String getId() { return id; }
    public String getTransactionId() { return transactionId; }
    public String getUploaderId() { return uploaderId; }
    public ProofType getProofType() { return proofType; }
    public String getImageUrl() { return imageUrl; }
    public String getNote() { return note; }
    public LocalDateTime getCapturedAt() { return capturedAt; }
    
    public void setId(String id) { this.id = id; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public void setUploaderId(String uploaderId) { this.uploaderId = uploaderId; }
    public void setProofType(ProofType proofType) { this.proofType = proofType; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setNote(String note) { this.note = note; }
    public void setCapturedAt(LocalDateTime capturedAt) { this.capturedAt = capturedAt; }

    //define methods
    public String getProofDetails() {
        return String.format("Evidence [ID=%s, Type=%s, Note=%s, CapturedAt=%s]", 
                id, proofType, note, capturedAt);
    }

}
