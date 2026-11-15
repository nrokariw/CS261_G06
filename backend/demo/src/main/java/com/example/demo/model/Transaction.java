package com.example.demo.model;

import com.example.demo.constant.TransactionStatus;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity 
@Table(name = "borrowing_transaction")
public class Transaction {

    //define attributes
    @Id 
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "request_id", length = 36, nullable = false, unique = true, insertable = false, updatable = false)
    private String requestId;

    // เพิ่ม JPA Relationship ไปยัง BorrowRequest
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", referencedColumnName = "request_id", nullable = false)
    private BorrowRequest borrowRequest;

    @Column(name = "borrower_id", length = 50, nullable = false)
    private String borrowerId;

    @Column(name = "lender_id", length = 50, nullable = false)
    private String lenderId;

    @Column(name = "item_id", length = 36, nullable = false)
    private String itemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TransactionStatus status = TransactionStatus.ACTIVE;
    
    @Column(name = "borrowed_at", columnDefinition = "DATETIME2")
    private LocalDateTime borrowedAt;
    
    @Column(name = "returned_at", columnDefinition = "DATETIME2")
    private LocalDateTime returnedAt;

    // สั่งให้สุ่มสร้าง UUID และกำหนดเวลาเป็น UTC+0 อัตโนมัติก่อนบันทึกลง Database
    @PrePersist
    protected void onCreate() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = UUID.randomUUID().toString(); // สร้าง UUID 36 หลัก
        }
        if (this.borrowedAt == null) {
            this.borrowedAt = LocalDateTime.now(ZoneOffset.UTC); // บันทึกเวลาเป็น UTC+0 เสมอ
        }
        if (this.status == null) {
            this.status = TransactionStatus.ACTIVE;
        }
    }

    /**
     * Default constructor สำหรับสร้างออบเจ็กต์ Transaction เปล่า
     */
    public Transaction() { }

    /**
     * Constructor สำหรับสร้างและกำหนดค่าเริ่มต้นให้กับการทำรายการทั้งหมด
     * 
     * @param id          รหัสประจำตัวการทำรายการ (Transaction ID)
     * @param requestId   รหัสประจำตัวคำขอยืมที่เกี่ยวข้อง (Borrow Request ID)
     * @param borrowRequest ออบเจ็กต์ BorrowRequest ที่เกี่ยวข้อง
     * @param borrowerId  รหัสประจำตัวของผู้ขอยืม
     * @param lenderId    รหัสประจำตัวของผู้ให้ยืม
     * @param itemId      รหัสประจำตัวของสิ่งของที่ถูกยืม
     * @param status      สถานะเริ่มต้นของการทำรายการ (เช่น ACTIVE, COMPLETED, DISPUTED)
     * @param borrowedAt  วันที่และเวลาที่เริ่มต้นการยืม
     * @param returnedAt  วันที่และเวลาที่คืนสิ่งของ 
     */
    public Transaction(String id, BorrowRequest borrowRequest, String borrowerId, String lenderId, String itemId, TransactionStatus status, LocalDateTime borrowedAt, LocalDateTime returnedAt) {
        this.id = id;
        this.borrowRequest = borrowRequest;
        if (borrowRequest != null) {
            this.requestId = borrowRequest.getId();
        }
        this.borrowerId = borrowerId;
        this.lenderId = lenderId;
        this.itemId = itemId;
        this.status = status != null ? status : TransactionStatus.ACTIVE;
        this.borrowedAt = borrowedAt != null ? borrowedAt : LocalDateTime.now(ZoneOffset.UTC);
        this.returnedAt = returnedAt;
    }

    //define getters and setters
    public String getId() { return id; }
    public String getRequestId() { 
        return requestId != null ? requestId : (borrowRequest != null ? borrowRequest.getId() : null); 
    }
    public BorrowRequest getBorrowRequest() { return borrowRequest; }
    public String getBorrowerId() { return borrowerId; }
    public String getLenderId() { return lenderId; }
    public String getItemId() { return itemId; }
    public TransactionStatus getStatus() { return status; }
    public LocalDateTime getBorrowedAt() { return borrowedAt; }
    public LocalDateTime getReturnedAt() { return returnedAt; }
    
    public void setId(String id) { this.id = id; }
    public void setBorrowRequest(BorrowRequest borrowRequest) { 
        this.borrowRequest = borrowRequest; 
        if (borrowRequest != null) {
            this.requestId = borrowRequest.getId();
        }
    }
    public void setBorrowerId(String borrowerId) { this.borrowerId = borrowerId; }
    public void setLenderId(String lenderId) { this.lenderId = lenderId; }
    public void setItemId(String itemId) { this.itemId = itemId; }
    public void setStatus(TransactionStatus status) { this.status = status; }
    public void setBorrowedAt(LocalDateTime borrowedAt) { this.borrowedAt = borrowedAt; }
    public void setReturnedAt(LocalDateTime returnedAt) { this.returnedAt = returnedAt; }

    //define methods
    public void completeTransaction() {
        this.status = TransactionStatus.COMPLETED;
        this.returnedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void addProof(EvidenceProof proof) {
        proof.setTransactionId(this.id);
    }

    public void disputeTransaction() {
        this.status = TransactionStatus.DISPUTED;
    }

}
