package com.example.demo.service;

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

}
