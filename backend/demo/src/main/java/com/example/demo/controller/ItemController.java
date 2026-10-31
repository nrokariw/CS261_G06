package com.example.demo.controller;

import com.example.demo.model.Item;
import com.example.demo.constant.ItemStatus;
import com.example.demo.dto.ItemCreateDto;
import com.example.demo.service.ItemService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController 
@RequestMapping ("${app.api.items-path:/api/items}")
public class ItemController {

    private final ItemService itemService;

    public ItemController(ItemService itemService) {
        this.itemService = itemService;
    }

    private String requireAuthenticatedStudentId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null || authentication.getName().isBlank()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing or invalid JWT Token");
        }
        return authentication.getName();
    }

    // 1. ดูรายการไอเท็มทั้งหมด (อนุญาต Guest เข้าดูได้)
    @GetMapping("/all")
    public ResponseEntity<List<Item>> getAllItems() {
        return ResponseEntity.ok(itemService.getAllItems());
    }

    // 2. ดึงรายการสิ่งของที่พร้อมให้ยืม (AVAILABLE Items - อนุญาต Guest เข้าดูได้)
    @GetMapping 
    public ResponseEntity<List<Item>> getItems(
            @RequestParam(value = "status", required = false, defaultValue = "AVAILABLE") String status) {

        ItemStatus itemStatus;
        try {
            itemStatus = ItemStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            itemStatus = ItemStatus.AVAILABLE;
        }

        List<Item> items = itemService.getAvailableItems(itemStatus);
        return ResponseEntity.ok(items);
    }

    // 2.1 ดึงข้อมูลสิ่งของตาม ID (US-02.2 - อนุญาต Guest เข้าดูได้)
    @GetMapping("/{id}")
    public ResponseEntity<Item> getItemById(@PathVariable("id") String id) {
        return itemService.getItemById(id)
                .filter(item -> item.getDeletedAt() == null)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
    }

    // 3. เพิ่มไอเท็มใหม่ (สกัด studentId จาก JWT SecurityContext เท่านั้น)
    @PostMapping(value = {"", "/{studentId}"}, consumes = {"multipart/form-data"})
    public ResponseEntity<Item> createItem(
            Authentication authentication,
            @PathVariable(value = "studentId", required = false) String ignoredPathStudentId,
            @ModelAttribute ItemCreateDto itemCreateDto) {

        String authenticatedStudentId = requireAuthenticatedStudentId(authentication);
        return createItemInternal(authenticatedStudentId, itemCreateDto);
    }

    @PostMapping(value = {"", "/{studentId}"}, consumes = {"application/json"})
    public ResponseEntity<Item> createItemJson(
            Authentication authentication,
            @PathVariable(value = "studentId", required = false) String ignoredPathStudentId,
            @RequestBody ItemCreateDto itemCreateDto) {

        String authenticatedStudentId = requireAuthenticatedStudentId(authentication);
        return createItemInternal(authenticatedStudentId, itemCreateDto);
    }

    private ResponseEntity<Item> createItemInternal(String authenticatedStudentId, ItemCreateDto itemCreateDto) {
        if (itemCreateDto.getTitle() == null || itemCreateDto.getTitle().trim().isEmpty() ||
            itemCreateDto.getCategory() == null || itemCreateDto.getCategory().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and Category are required.");
        }

        try {
            Item createdItem = itemService.createItemForUser(authenticatedStudentId, itemCreateDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdItem);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // ==========================================
    // US-04: แก้ไขและลบประกาศสิ่งของ (T-4.1)
    // ==========================================

    // 4. PUT /api/items/{id} - แก้ไขข้อมูลประกาศ (ดึงตัวตนจาก SecurityContext เท่านั้น)
    @PutMapping(value = "/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<Item> updateItem(
            @PathVariable("id") String itemId,
            Authentication authentication,
            @ModelAttribute ItemCreateDto requestDto) {

        String authenticatedStudentId = requireAuthenticatedStudentId(authentication);
        Item updatedItem = itemService.updateItem(itemId, authenticatedStudentId, requestDto);
        return ResponseEntity.ok(updatedItem);
    }

    @PutMapping(value = "/{id}", consumes = {"application/json"})
    public ResponseEntity<Item> updateItemJson(
            @PathVariable("id") String itemId,
            Authentication authentication,
            @RequestBody ItemCreateDto requestDto) {

        String authenticatedStudentId = requireAuthenticatedStudentId(authentication);
        Item updatedItem = itemService.updateItem(itemId, authenticatedStudentId, requestDto);
        return ResponseEntity.ok(updatedItem);
    }

    // 5. DELETE /api/items/{id} - ลบประกาศแบบ Soft Delete (ดึงตัวตนจาก SecurityContext เท่านั้น)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItem(
            @PathVariable("id") String itemId,
            Authentication authentication) {

        String authenticatedStudentId = requireAuthenticatedStudentId(authentication);
        itemService.deleteItem(itemId, authenticatedStudentId);
        return ResponseEntity.ok(Map.of("message", "Item deleted successfully"));
    }
}
