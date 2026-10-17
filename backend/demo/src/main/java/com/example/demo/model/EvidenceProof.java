package com.example.demo.model;

import com.example.demo.constant.ProofType;
import org.joda.time.DateTime;

public class EvidenceProof {

    //define attributes
    private String id;
    private String transactionId;
    private String uploaderId;
    private ProofType proofType;
    private String imageUrl;
    private String note;
    private DateTime capturedAt;

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
    public EvidenceProof(String id, String transactionId, String uploaderId, ProofType proofType, String imageUrl, String note, DateTime capturedAt) {
        this.id = id;
        this.transactionId = transactionId;
        this.uploaderId = uploaderId;
        this.proofType = proofType;
        this.imageUrl = imageUrl;
        this.note = note;
        this.capturedAt = capturedAt;
    }

    //define getters and setters
    public String getId() { return id; }
    public String getTransactionId() { return transactionId; }
    public String getUploaderId() { return uploaderId; }
    public ProofType getProofType() { return proofType; }
    public String getImageUrl() { return imageUrl; }
    public String getNote() { return note; }
    public DateTime getCapturedAt() { return capturedAt; }
    public void setId(String id) { this.id = id; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public void setUploaderId(String uploaderId) { this.uploaderId = uploaderId; }
    public void setProofType(ProofType proofType) { this.proofType = proofType; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setNote(String note) { this.note = note; }
    public void setCapturedAt(DateTime capturedAt) { this.capturedAt = capturedAt; }

    //define methods
    public String getProofDetails() {
        return String.format("Evidence [ID=%s, Type=%s, Note=%s, CapturedAt=%s]", 
                id, proofType, note, capturedAt);
    }

}
