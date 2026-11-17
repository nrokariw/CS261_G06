package com.example.demo.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class LoanEvidenceResponseDto {

    // ข้อมูล BorrowRequest และ Transaction
    private String requestId;
    private String requestStatus;
    private String transactionId;
    private String transactionStatus;
    private LocalDateTime borrowedAt;
    private LocalDateTime returnedAt;
    private String borrowerId;
    private String ownerId;

    // ข้อมูล Item
    private String itemId;
    private String itemTitle;
    private String itemCategory;

    // ข้อมูลหลักฐานการส่งมอบ (HANDOVER Evidence)
    private String handoverImageUrl;
    private String handoverNote;
    private LocalDateTime handoverTimestamp;

    // ข้อมูลหลักฐานการส่งคืน (RETURN Evidence)
    private String returnImageUrl;
    private String returnNote;
    private LocalDateTime returnTimestamp;

    // รายการหลักฐานทั้งหมด (EvidenceProof)
    private List<EvidenceItemDto> evidences = new ArrayList<>();

    public static class EvidenceItemDto {
        private String id;
        private String uploaderId;
        private String proofType;
        private String imageUrl;
        private String note;
        private LocalDateTime capturedAt;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getUploaderId() { return uploaderId; }
        public void setUploaderId(String uploaderId) { this.uploaderId = uploaderId; }
        public String getProofType() { return proofType; }
        public void setProofType(String proofType) { this.proofType = proofType; }
        public String getImageUrl() { return imageUrl; }
        public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
        public LocalDateTime getCapturedAt() { return capturedAt; }
        public void setCapturedAt(LocalDateTime capturedAt) { this.capturedAt = capturedAt; }
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getTransactionStatus() {
        return transactionStatus;
    }

    public void setTransactionStatus(String transactionStatus) {
        this.transactionStatus = transactionStatus;
    }

    public LocalDateTime getBorrowedAt() {
        return borrowedAt;
    }

    public void setBorrowedAt(LocalDateTime borrowedAt) {
        this.borrowedAt = borrowedAt;
    }

    public LocalDateTime getReturnedAt() {
        return returnedAt;
    }

    public void setReturnedAt(LocalDateTime returnedAt) {
        this.returnedAt = returnedAt;
    }

    public List<EvidenceItemDto> getEvidences() {
        return evidences;
    }

    public void setEvidences(List<EvidenceItemDto> evidences) {
        this.evidences = evidences;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public String getRequestStatus() {
        return requestStatus;
    }

    public void setRequestStatus(String requestStatus) {
        this.requestStatus = requestStatus;
    }

    public String getBorrowerId() {
        return borrowerId;
    }

    public void setBorrowerId(String borrowerId) {
        this.borrowerId = borrowerId;
    }

    public String getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public String getItemTitle() {
        return itemTitle;
    }

    public void setItemTitle(String itemTitle) {
        this.itemTitle = itemTitle;
    }

    public String getItemCategory() {
        return itemCategory;
    }

    public void setItemCategory(String itemCategory) {
        this.itemCategory = itemCategory;
    }

    public String getHandoverImageUrl() {
        return handoverImageUrl;
    }

    public void setHandoverImageUrl(String handoverImageUrl) {
        this.handoverImageUrl = handoverImageUrl;
    }

    public String getHandoverNote() {
        return handoverNote;
    }

    public void setHandoverNote(String handoverNote) {
        this.handoverNote = handoverNote;
    }

    public LocalDateTime getHandoverTimestamp() {
        return handoverTimestamp;
    }

    public void setHandoverTimestamp(LocalDateTime handoverTimestamp) {
        this.handoverTimestamp = handoverTimestamp;
    }

    public String getReturnImageUrl() {
        return returnImageUrl;
    }

    public void setReturnImageUrl(String returnImageUrl) {
        this.returnImageUrl = returnImageUrl;
    }

    public String getReturnNote() {
        return returnNote;
    }

    public void setReturnNote(String returnNote) {
        this.returnNote = returnNote;
    }

    public LocalDateTime getReturnTimestamp() {
        return returnTimestamp;
    }

    public void setReturnTimestamp(LocalDateTime returnTimestamp) {
        this.returnTimestamp = returnTimestamp;
    }
}