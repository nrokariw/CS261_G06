package com.example.demo.controller;

import com.example.demo.model.Item;
import com.example.demo.constant.ItemStatus;
import com.example.demo.dto.ItemCreateDto;
import com.example.demo.service.ItemService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController 
@RequestMapping ("${app.api.items-path:/api/items}")

public class ItemController {

    //define attributes
    private final ItemService itemService;

    //define constructor
    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    // 1.1. ดึงรายการไอเท็มทั้งหมด
    @GetMapping("/all")
    public ResponseEntity<List<Item>> getAllItems() {
        return ResponseEntity.ok(itemService.getAllItems());
    }

    // 1.2. ดึงรายการสิ่งของที่พร้อมให้ยืม (AVAILABLE Items)
    @GetMapping 
    public ResponseEntity<List<Item>> getItems(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "status", required = false, defaultValue = "AVAILABLE") String status) {

        // ตรวจสอบ JWT Token (คืนค่า 401 Unauthorized หากไม่มี Token หรือไม่ถูกต้อง)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }

        // แปลงค่า Query Parameter String เป็น Enum ItemStatus
        ItemStatus itemStatus;
        try {
            itemStatus = ItemStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            itemStatus = ItemStatus.AVAILABLE; // Default หากส่งค่าพารามิเตอร์ผิดพลาด
        }

        // เรียกใช้งาน Service เพื่อคิวรีข้อมูล
        List<Item> items = itemService.getAvailableItems(itemStatus);

        // คืนค่า 200 OK พร้อม Array ของรายการสิ่งของ
        return ResponseEntity.ok(items);
    }

    // 1.3. ดึงข้อมูลสิ่งของตาม ID 
    @GetMapping("/{id}")
    public ResponseEntity<Item> getItemById(
            @PathVariable("id") String id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }

        return itemService.getItemById(id)
                .filter(item -> item.getDeletedAt() == null)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
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


    // 3. PUT /api/items/{id} - แก้ไขข้อมูลประกาศ (รองรับทั้ง multipart/form-data และ application/json)
    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<Item> updateItem(
            @PathVariable("id") String itemId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "userId", required = false) String userId,
            @ModelAttribute ItemCreateDto requestDto) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }

        // TODO: ดึง userId จาก JWT Token เมื่อเชื่อมต่อระบบ Auth จริง
        Item updatedItem = itemService.updateItem(itemId, userId, requestDto);
        return ResponseEntity.ok(updatedItem);
    }

    // 4. อัปเดตข้อมูลสิ่งของ ผ่านทาง JSON Payload
    @PutMapping(value = "/{id}", consumes = {"application/json"})
    public ResponseEntity<Item> updateItemJson(
            @PathVariable("id") String itemId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestBody ItemCreateDto requestDto) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }

        // TODO: ดึง userId จาก JWT Token เมื่อเชื่อมต่อระบบ Auth จริง
        Item updatedItem = itemService.updateItem(itemId, userId, requestDto);
        return ResponseEntity.ok(updatedItem);
    }

    // 5. DELETE /api/items/{id} - ลบประกาศแบบ Soft Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItem(
            @PathVariable("id") String itemId,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "userId", required = false) String userId) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }

        // TODO: ดึง userId จาก JWT Token เมื่อเชื่อมต่อระบบ Auth จริง
        itemService.deleteItem(itemId, userId);
        return ResponseEntity.ok(Map.of("message", "Item deleted successfully"));
    }

}

