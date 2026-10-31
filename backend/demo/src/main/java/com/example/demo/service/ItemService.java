package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.dto.ItemCreateDto; // DTO สำหรับรับข้อมูล multipart
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import java.util.List;
import java.util.Optional;

@Service 
public class ItemService {
    
    //define attributes
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService; // เพิ่ม Service สำหรับจัดการไฟล์รูปภาพ

    //define constructor
    public ItemService(ItemRepository itemRepository, 
                       UserRepository userRepository, 
                       FileStorageService fileStorageService) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    // 1. สร้างไอเท็มใหม่จาก User Model พร้อมรองรับการอัปโหลดรูปภาพ 
    public Item createItemForUser(String studentId, ItemCreateDto itemCreateDto) {

        if (studentId != null && !studentId.isEmpty() && !userRepository.existsById(studentId)) {
            userRepository.save(new User(studentId, studentId, studentId, "", ""));
        }

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

    // 2.1. ดึงรายการไอเท็มทั้งหมด
    public List<Item> getAllItems() {
        return itemRepository.findAll()
                .stream()
                .filter(item -> item.getDeletedAt() == null)
                .toList();
    }

    // 2.2. ค้นหาไอเท็มตาม ID
    public Optional<Item> getItemById(String id) {
        return itemRepository.findById(id);
    }

    // 2.3. ค้นหาไอเท็มของ User คนนี้
    public List<Item> getItemsByOwner(String ownerId) {
        return itemRepository.findByOwnerId(ownerId);
    }

    // 2.4. ดึงรายการตามสถานะที่ยังไม่ถูกลบ เรียงจากใหม่ไปเก่า
    public List<Item> getAvailableItems(ItemStatus status) {
        return itemRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(status);
    }  

    // 3.1. อัพเดทไอเท็ม
    public Item updateItem(String itemId, ItemCreateDto dto) {
        return updateItem(itemId, null, dto);
    }

    // 3.2. แก้ไขข้อมูลประกาศ (PUT /api/items/{id})
    public Item updateItem(String itemId, String userId, ItemCreateDto requestDto) {
        // ตรวจสอบว่ามีไอเท็มนี้อยู่จริง และยังไม่ถูกลบ
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No items matching your request were found"));

        if (item.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This item has been removed");
        }

        // ตรวจสอบสิทธิ์ความเป็นเจ้าของ (403 Forbidden หากไม่ใช่เจ้าของ)
        if (userId != null && !userId.isBlank() && !item.getOwnerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to edit this notice");
        }

        // ตรวจสอบสถานะต้องเป็น Available เท่านั้น (409 Conflict)
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot be edited because the item is not available for loan");
        }

        // อัปเดตข้อมูลเฉพาะที่มีการส่งมา
        if (requestDto.getTitle() != null && !requestDto.getTitle().trim().isEmpty()) {
            item.setTitle(requestDto.getTitle().trim());
        }
        if (requestDto.getCategory() != null && !requestDto.getCategory().trim().isEmpty()) {
            item.setCategory(requestDto.getCategory().trim());
        }
        if (requestDto.getDescription() != null) {
            item.setDescription(requestDto.getDescription().trim());
        }

        // อัปโหลดรูปภาพใหม่ (ถ้ามี)
        if (requestDto.getImageFile() != null && !requestDto.getImageFile().isEmpty()) {
            String newImageUrl = fileStorageService.storeFile(requestDto.getImageFile());
            item.setImageUrl(newImageUrl);
        }

        item.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        return itemRepository.save(item);
    }

    // 4.1. ลบไอเท็ม
    public void deleteItem(String itemId) {
        deleteItem(itemId, null);
    }

    // 4.2. ลบประกาศแบบ Soft Delete (DELETE /api/items/{id})
    public void deleteItem(String itemId, String userId) {
        // ตรวจสอบว่ามีไอเท็มนี้อยู่จริง
        Item item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "The item you wish to delete could not be found"));

        if (item.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This item has been deleted");
        }

        // ตรวจสอบสิทธิ์ความเป็นเจ้าของ (403 Forbidden)
        if (userId != null && !userId.isBlank() && !item.getOwnerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to delete this notice");
        }

        // ตรวจสอบสถานะต้องเป็น Available เท่านั้น (409 Conflict)
        if (item.getStatus() != ItemStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot be deleted because the item is not available for loan");
        }

        // ทำ Soft Delete โดยบันทึกเวลา deletedAt และ updatedAt
        item.delete();
        item.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        itemRepository.save(item);
    }

}
