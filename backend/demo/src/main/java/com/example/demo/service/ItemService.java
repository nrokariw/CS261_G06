package com.example.demo.service;

import com.example.demo.dto.ItemCreateDto; // DTO สำหรับรับข้อมูล multipart
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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
        // ค้นหา User จาก Database (ถ้าไม่เจอจะโยน Exception ออกไป)
        User user = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + studentId));

        // อัปโหลดรูปภาพผ่าน FileStorageService (จะตรวจสอบ Mime-Type และขนาดไฟล์ให้อัตโนมัติ)
        String imageUrl = null;
        if (itemCreateDto.getImageFile() != null && !itemCreateDto.getImageFile().isEmpty()) {
            imageUrl = fileStorageService.storeFile(itemCreateDto.getImageFile());
        }

        // แปลงข้อมูลจาก Request DTO เป็น Item Object
        Item itemData = new Item();
        itemData.setTitle(itemCreateDto.getTitle());
        itemData.setCategory(itemCreateDto.getCategory());
        itemData.setDescription(itemCreateDto.getDescription());
        itemData.setImageUrl(imageUrl); // เซ็ต Path รูปภาพที่อัปโหลดแล้ว

        // เรียกใช้เมธอด createItem ใน User Model ของคุณ (เพื่อกำหนด ownerId และสถานะเริ่มต้น)
        Item newItem = user.createItem(itemData);

        // บันทึกลง MSSQL Database
        return itemRepository.save(newItem);
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

}
