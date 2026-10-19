package com.example.demo.model;

import com.example.demo.constant.ItemStatus;
import jakarta.persistence.*;
import org.joda.time.DateTime;

@Entity 
@Table(name = "items")
public class Item {

    //define attributes
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemStatus status = ItemStatus.AVAILABLE;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Column(name = "created_at", updatable = false)
    private DateTime createdAt = DateTime.now();

    @Column(name = "updated_at")
    private DateTime updatedAt = DateTime.now();

    @Column(name = "deleted_at")
    private DateTime deletedAt;

    /**
     * Default constructor สำหรับสร้างออบเจ็กต์ Item เปล่า
     */
    public Item() { }

    /**
     * Constructor สำหรับสร้างและกำหนดค่าเริ่มต้นให้กับสิ่งของทั้งหมด
     * 
     * @param id          รหัสประจำตัวสิ่งของ (Item ID)
     * @param title       ชื่อของสิ่งของ
     * @param description คำอธิบายเกี่ยวกับสิ่งของ
     * @param category    หมวดหมู่ของสิ่งของ
     * @param status      สถานะเริ่มต้นของสิ่งของ (เช่น AVAILABLE, BORROWED, RESERVED, UNAVAILABLE)
     * @param imageUrl    ลิงก์หรือที่อยู่ของรูปภาพสิ่งของที่อัปโหลด
     * @param ownerId     รหัสประจำตัวของเจ้าของสิ่งของ
     * @param createdAt   วันที่และเวลาที่สร้างสิ่งของ
     * @param updatedAt   วันที่และเวลาที่อัปเดตสิ่งของ
     * @param deletedAt   วันที่และเวลาที่ลบสิ่งของ
     */
    public Item(String id, String title, String description, String category, ItemStatus status, String imageUrl, String ownerId) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.status = status != null ? status : ItemStatus.AVAILABLE;
        this.imageUrl = imageUrl;
        this.ownerId = ownerId;
        this.createdAt = DateTime.now();
        this.updatedAt = DateTime.now();
    }

    //define getters and setters
    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public ItemStatus getStatus() { return status; }
    public String getImageUrl() { return imageUrl; }
    public String getOwnerId() { return ownerId; }
    public void setId(String id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setStatus(ItemStatus status) { this.status = status; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    
    public DateTime getCreatedAt() { return createdAt; }
    public DateTime getUpdatedAt() { return updatedAt; }
    public DateTime getDeletedAt() { return deletedAt; }

    //define methods
    public void updateDetails(String title, String description) {
        this.title = title;
        this.description = description;
        this.updatedAt = DateTime.now();
    }
    public void updateStatus(ItemStatus status) {
        this.status = status; 
        this.updatedAt = DateTime.now();
    }
    public void delete() {
        this.status = ItemStatus.UNAVAILABLE;
        this.deletedAt = DateTime.now();
    }

}
