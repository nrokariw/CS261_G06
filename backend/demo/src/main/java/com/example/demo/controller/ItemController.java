package com.example.demo.controller;

import com.example.demo.model.Item;
import com.example.demo.dto.ItemCreateDto;
import com.example.demo.service.ItemService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController 
@RequestMapping ("/api/items")

public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    // 1. ดูรายการไอเท็มทั้งหมด
    @GetMapping
    public ResponseEntity<List<Item>> getAllItems() {
        return ResponseEntity.ok(itemService.getAllItems());
    }

    // 2. เพิ่มไอเท็มใหม่ (รองรับ Multipart และตรวจสอบ Token / StudentId)
    @PostMapping(value = "/{studentId}", consumes = {"multipart/form-data"})
    public ResponseEntity<Item> createItem(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String studentId, 
            @ModelAttribute ItemCreateDto itemCreateDto) {

        // ตรวจสอบ JWT Token (คืนค่า 401 Unauthorized หากไม่มี Token)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT token");
        }
        // TODO: สกัดดึง ownerId/studentId จาก JWT Token
        String ownerId = "6400000001";

        // Validate ข้อมูลบังคับ (คืนค่า 400 Bad Request หากขาด Title หรือ Category)
        if (itemCreateDto.getTitle() == null || itemCreateDto.getTitle().trim().isEmpty() ||
            itemCreateDto.getCategory() == null || itemCreateDto.getCategory().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and Category are required.");
        }

        try {
            // เรียกใช้ Service ที่จัดการทั้ง User, File Upload และ Database
            Item createdItem = itemService.createItemForUser(studentId, itemCreateDto);
            
            // ตอบกลับ 201 Created พร้อมข้อมูลที่สร้างสำเร็จ
            return ResponseEntity.status(HttpStatus.CREATED).body(createdItem);
            
        } catch (IllegalArgumentException e) {
            // ดักจับ Error จากการอัปโหลดไฟล์ผิดประเภท/เกินขนาด (ตอบ 400 Bad Request)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } 
    }
}

