package com.example.demo.model;

import com.example.demo.constant.ItemStatus;

public class Item {
    
    //define attributes
    private String id;
    private String title;
    private String description;
    private String category;
    private ItemStatus status;
    private String imageUrl;
    private String ownerId;

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
     */
    public Item(String id, String title, String description, String category, ItemStatus status, String imageUrl, String ownerId) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.status = status;
        this.imageUrl = imageUrl;
        this.ownerId = ownerId;
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

    //define methods
    /// public void updateDetails(String title, String description) {
    ///     this.title = title;
    ///     this.description = description;
    /// }
    /// public void updateStatus(ItemStatus status) { this.status = status; }
    ///public void delete() { }

}
