package com.example.demo.dto;

import java.time.LocalDateTime;

public class LoanEvidenceResponseDto {
    
    // ข้อมูล Transaction
    private String requestId;
    private String requestStatus;
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