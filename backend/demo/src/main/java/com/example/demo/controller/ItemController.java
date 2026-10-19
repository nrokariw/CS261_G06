package com.example.demo.controller;

import com.example.demo.model.Item;
import com.example.demo.dto.ItemCreateDto;
import com.example.demo.service.ItemService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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
    public ResponseEntity<?> createItem(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String studentId, 
            @ModelAttribute ItemCreateDto itemCreateDto) {

        // ตรวจสอบ JWT Token เบื้องต้น (US-01.3)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized: Missing or invalid JWT Token");
        }

        // Validate ข้อมูลบังคับ
        if (itemCreateDto.getTitle() == null || itemCreateDto.getTitle().trim().isEmpty() ||
            itemCreateDto.getCategory() == null || itemCreateDto.getCategory().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Title and Category are required fields.");
        }

        try {
            // เรียกใช้ Service ที่จัดการทั้ง User, File Upload และ Database
            Item createdItem = itemService.createItemForUser(studentId, itemCreateDto);
            
            // ตอบกลับ 201 Created พร้อมข้อมูลที่สร้างสำเร็จ
            return ResponseEntity.status(HttpStatus.CREATED).body(createdItem);
            
        } catch (IllegalArgumentException e) {
            // ดักจับ Error จากการอัปโหลดไฟล์ผิดประเภท/เกินขนาด (ตอบ 400 Bad Request)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (RuntimeException e) {
            // ดักจับ Error กรณีไม่พบ User
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

}
