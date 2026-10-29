package com.example.demo.model;

import com.example.demo.constant.RequestStatus;

import java.util.UUID;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import jakarta.persistence.*;

@Entity
@Table(name = "borrow_requests")
public class BorrowRequest {
 
    //define attributes
    @Id
    @Column(name = "request_id", length = 36)
    private String id;

    @Column(name = "item_id", nullable = false, length = 36)
    private String itemId;

    @Column(name = "borrower_id", nullable = false)
    private String borrowerId;

    @Column(columnDefinition = "DATETIME2")
    private LocalDateTime startDate;

    @Column(columnDefinition = "DATETIME2")
    private LocalDateTime endDate;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String reason;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "request_status", nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(columnDefinition = "DATETIME2")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


    // สั่งให้สุ่มสร้าง UUID และกำหนดเวลาเป็น UTC+0 อัตโนมัติก่อนบันทึกลง Database
    @PrePersist
    protected void onCreate() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = UUID.randomUUID().toString(); // สร้าง UUID 36 หลัก
        }   
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(ZoneOffset.UTC); 
        }
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
        }
        if (this.status == null) {
            this.status = RequestStatus.PENDING;
        }
    }


    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }


    /**
     * Default constructor สำหรับสร้างออบเจ็กต์ BorrowRequest เปล่า
     */
    public BorrowRequest() { }

    /**
     * Constructor สำหรับสร้างและกำหนดค่าเริ่มต้นให้กับคำขอยืมทั้งหมด
     * 
     * @param id          รหัสประจำตัวคำขอยืม (Request ID)
     * @param itemId      รหัสประจำตัวของสิ่งของที่ต้องการยืม
     * @param borrowerId  รหัสประจำตัวของผู้ขอยืม
     * @param startDate   วันที่เริ่มต้นยืม
     * @param endDate     กำหนดวันสิ้นสุดการยืม
     * @param reason      เหตุผลในการยืม
     * @param status      สถานะเริ่มต้นของคำขอยืม (เช่น PENDING, ACCEPTED, REJECTED, CANCELLED)
     * @param createdAt   วันที่และเวลาที่สร้างคำขอยืมนี้ขึ้นมา
     */
    public BorrowRequest(String id, String itemId, String borrowerId, LocalDateTime startDate, LocalDateTime endDate, String reason, RequestStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.itemId = itemId;
        this.borrowerId = borrowerId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
        this.status = status != null ? status : RequestStatus.PENDING;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now(ZoneOffset.UTC);
    }

    //define getters and setters
    public String getId() { return id; }
    public String getItemId() { return itemId; }
    public String getBorrowerId() { return borrowerId; }
    public LocalDateTime getStartDate() { return startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public String getReason() { return reason; }
    public RequestStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    
    public void setId(String id) { this.id = id; }
    public void setItemId(String itemId) { this.itemId = itemId; }
    public void setBorrowerId(String borrowerId) { this.borrowerId = borrowerId; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    public void setReason(String reason) { this.reason = reason; }
    public void setStatus(RequestStatus status) { this.status = status; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    //define methods
    public void approve() {
        if (this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Cannot approve request that is not pending");
        }
        this.status = RequestStatus.ACCEPTED;
    }

    public void reject() {
        if (this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Cannot reject request that is not pending");
        }
        this.status = RequestStatus.REJECTED;
    }

    public void resetToPending() {
        this.status = RequestStatus.PENDING;
    }

    public void cancel() {
        // ตรวจสอบว่าสถานะปัจจุบันอนุญาตให้ยกเลิกได้ไหม (เช่น ต้องเป็น PENDING อยู่)
        if (this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Cannot cancel request that is not pending");
        }
        this.status = RequestStatus.CANCELLED;
    }
    
}
