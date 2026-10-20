package com.example.demo.model;

import com.example.demo.constant.RequestStatus;

import java.util.UUID;

import java.time.LocalDateTime;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;

@Entity
public class BorrowRequest {
    @Id
    //define attributes
    private String id;
    private String itemId;
    private String borrowerId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private RequestStatus status;
    private LocalDateTime createdAt;

    // สั่งให้สุ่มสร้าง UUID อัตโนมัติก่อนบันทึกลง Database
    @PrePersist
    protected void onCreate() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = UUID.randomUUID().toString(); // สร้าง UUID 36 หลัก
        }   
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
     * @param status      สถานะเริ่มต้นของคำขอยืม (เช่น PENDING, ACCEPTED, REJECTED, CANCELLED)
     * @param createdAt   วันที่และเวลาที่สร้างคำขอยืมนี้ขึ้นมา
     */
    public BorrowRequest(String id, String itemId, String borrowerId, LocalDateTime startDate, LocalDateTime endDate, RequestStatus status, LocalDateTime createdAt) {
        this.id = id;
        this.itemId = itemId;
        this.borrowerId = borrowerId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.createdAt = createdAt;
    }

    //define getters and setters
    public String getId() { return id; }
    public String getItemId() { return itemId; }
    public String getBorrowerId() { return borrowerId; }
    public LocalDateTime getStartDate() { return startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public RequestStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    
    public void setId(String id) { this.id = id; }
    public void setItemId(String itemId) { this.itemId = itemId; }
    public void setBorrowerId(String borrowerId) { this.borrowerId = borrowerId; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    public void setStatus(RequestStatus status) { this.status = status; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    //define methods
     public void approve() {
         this.status = RequestStatus.ACCEPTED;
    }
    public void reject() {
        this.status = RequestStatus.REJECTED;
    }
    public void cancel() {
        // ตรวจสอบว่าสถานะปัจจุบันอนุญาตให้ยกเลิกได้ไหม (เช่น ต้องเป็น PENDING อยู่)
        if (this.status != RequestStatus.PENDING) {
            throw new IllegalStateException("Cannot cancel request that is not pending");
        }
        this.status = RequestStatus.CANCELLED;
    }
    
}
