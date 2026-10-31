package com.example.demo.model;

import com.example.demo.constant.ItemStatus;
import jakarta.persistence.*;

import java.util.UUID;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "items") 
public class Item {

    //define attributes
    @Id
    @Column(name = "item_id", length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Column(nullable = false, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(nullable = false, columnDefinition = "NVARCHAR(100)")
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemStatus status = ItemStatus.AVAILABLE;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    
    // สั่งให้สุ่มสร้าง UUID และกำหนด วันที่ เวลา เป็น UTC+0 อัตโนมัติก่อนบันทึกลง Database
    @PrePersist
    protected void onCreate() {
        if (this.id == null || this.id.isEmpty()) {
            this.id = UUID.randomUUID().toString(); //สร้าง UUID 36 ตัว
        }
        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        if (this.createdAt == null) {
            this.createdAt = nowUtc;
        }
        if (this.updatedAt == null) {
            this.updatedAt = nowUtc;
        }
        if (this.status == null) {
            this.status = ItemStatus.AVAILABLE;
        }
    }

    // อัพเดทเวลาเมื่อมีการแก้ไขคำขอยืมเสร็จสิ้นอัตโนมัติ ก่อนบันทึกลง Database
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    /**
     * Default constructor สำหรับสร้างออบเจ็กต์ Item เปล่า
     */
    public Item() { }

    /**
     * Constructor สำหรับสร้างและกำหนดค่าเริ่มต้นให้กับสิ่งของทั้งหมด
     * 
     * @param id          รหัสประจำตัวสิ่งของ (Item ID)
     * @param ownerId     รหัสประจำตัวของเจ้าของสิ่งของ
     * @param title       ชื่อของสิ่งของ
     * @param description คำอธิบายเกี่ยวกับสิ่งของ
     * @param category    หมวดหมู่ของสิ่งของ
     * @param status      สถานะเริ่มต้นของสิ่งของ (เช่น AVAILABLE, BORROWED, RESERVED, UNAVAILABLE)
     * @param imageUrl    ลิงก์หรือที่อยู่ของรูปภาพสิ่งของที่อัปโหลด
     * @param createdAt   วันที่และเวลาที่สร้างสิ่งของ
     * @param updatedAt   วันที่และเวลาที่อัปเดตสิ่งของ
     * @param deletedAt   วันที่และเวลาที่ลบสิ่งของ
     */
    public Item(String id, String ownerId, String title, String description, String category, ItemStatus status, String imageUrl) {
        this.id = id;
        this.ownerId = ownerId;
        this.title = title;
        this.description = description;
        this.category = category;
        this.status = status != null ? status : ItemStatus.AVAILABLE;
        this.imageUrl = imageUrl;
        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        this.createdAt = nowUtc;
        this.updatedAt = nowUtc;
    }

    //define getters and setters
    public String getId() { return id; }
    public String getOwnerId() { return ownerId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public ItemStatus getStatus() { return status; }
    public String getImageUrl() { return imageUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getDeletedAt() { return deletedAt; }

    public void setId(String id) { this.id = id; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setStatus(ItemStatus status) { this.status = status; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }

    //define methods
    public void updateDetails(String title, String description) {
        this.title = title;
        this.description = description;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
    
    public void updateStatus(ItemStatus status) {
        this.status = status; 
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void delete() {
        this.status = ItemStatus.UNAVAILABLE; 
        this.deletedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

}
