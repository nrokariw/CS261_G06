package com.example.demo.controller;

import com.example.demo.model.Item;
import com.example.demo.service.ItemService;
import org.springframework.web.bind.annotation.*;

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
    public List<Item> getAllItems() {
        return itemService.getAllItems();
    }

    // 2. เพิ่มไอเท็มใหม่ (ระบุรหัสเจ้าของผ่าน URL)
    @PostMapping("/{studentId}")
    public Item createItem(@PathVariable String studentId, @RequestBody Item item) {
        return itemService.createItemForUser(studentId, item);
    }

}
