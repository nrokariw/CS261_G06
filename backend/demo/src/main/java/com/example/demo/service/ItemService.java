package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.dto.ItemCreateDto; // DTO สำหรับรับข้อมูล multipart
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service 
public class ItemService {
    
    private final ItemRepository itemRepository;

    private final UserRepository userRepository;

    private final FileStorageService fileStorageService; // เพิ่ม Service สำหรับจัดการไฟล์รูปภาพ

    public ItemService(ItemRepository itemRepository, 
                       UserRepository userRepository, 
                       FileStorageService fileStorageService) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    // 1. สร้างไอเท็มใหม่จาก User Model พร้อมรองรับการอัปโหลดรูปภาพ (US-01.2 & US-01.3)
    public Item createItemForUser(String studentId, ItemCreateDto itemCreateDto) {

        // อัปโหลดรูปภาพผ่าน FileStorageService (จะตรวจสอบ Mime-Type และขนาดไฟล์ให้อัตโนมัติ)
        String imageUrl = null;
        if (itemCreateDto.getImageFile() != null && !itemCreateDto.getImageFile().isEmpty()) {
            imageUrl = fileStorageService.storeFile(itemCreateDto.getImageFile());
        }

        // สร้าง item และกำหนด ownerId
        Item item = new Item();
        item.setOwnerId(studentId);
        item.setTitle(itemCreateDto.getTitle());
        item.setCategory(itemCreateDto.getCategory());
        item.setDescription(itemCreateDto.getDescription());
        item.setImageUrl(imageUrl);

        // บันทึกลง MSSQL Database
        return itemRepository.save(item);
    }

    // 2.ดึงรายการไอเท็มทั้งหมด
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    // 3.ค้นหาไอเท็มตาม ID
    public Optional<Item> getItemById(String id) {
        return itemRepository.findById(id);
    }

    // 4.ค้นหาไอเท็มของ User คนนี้
    public List<Item> getItemsByOwner(String ownerId) {
        return itemRepository.findByOwnerId(ownerId);
    }

    // 5.ดึงรายการตามสถานะที่ยังไม่ถูกลบ เรียงจากใหม่ไปเก่า
    public List<Item> getAvailableItems(ItemStatus status) {
        return itemRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(status);
    }  
    
    // ==========================================
    // US-04: แก้ไขและลบประกาศสิ่งของ (T-4.1)
    // ==========================================

    // 6. แก้ไขข้อมูลประกาศ (PUT /api/items/{id})
    public Item updateItem(Long itemId, String userId, ItemCreateDto requestDto) {
        // ตรวจสอบว่ามีไอเท็มนี้อยู่จริง และยังไม่ถูกลบ
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบรายการสิ่งของที่ต้องการแก้ไข"));

        if (item.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "รายการสิ่งของนี้ถูกลบไปแล้ว");
        }

        // ตรวจสอบสิทธิ์ความเป็นเจ้าของ (403 Forbidden หากไม่ใช่เจ้าของ)
        if (!item.getOwnerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "คุณไม่มีสิทธิ์แก้ไขประกาศนี้");
        }

        // ตรวจสอบสถานะต้องเป็น Available เท่านั้น (409 Conflict)
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ไม่สามารถแก้ไขได้ เนื่องจากสิ่งของไม่อยู่ในสถานะพร้อมให้ยืม (Available)");
        }

        // อัปเดตข้อมูลเฉพาะที่มีการส่งมา
        if (requestDto.getTitle() != null && !requestDto.getTitle().trim().isEmpty()) {
            item.setTitle(requestDto.getTitle());
        }
        if (requestDto.getCategory() != null && !requestDto.getCategory().trim().isEmpty()) {
            item.setCategory(requestDto.getCategory());
        }
        if (requestDto.getDescription() != null) {
            item.setDescription(requestDto.getDescription());
        }

        // อัปโหลดรูปภาพใหม่ (ถ้ามี)
        if (requestDto.getImageFile() != null && !requestDto.getImageFile().isEmpty()) {
            String newImageUrl = fileStorageService.storeFile(requestDto.getImageFile());
            item.setImageUrl(newImageUrl);
        }

        item.setUpdatedAt(LocalDateTime.now());
        return itemRepository.save(item);
    }
}
