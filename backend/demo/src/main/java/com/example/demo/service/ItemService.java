package com.example.demo.service;

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

    public ItemService(ItemRepository itemRepository, UserRepository userRepository) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
    }

    // 1.สร้างไอเท็มใหม่จาก User Model
    public Item createItemForUser(String studentId, Item itemData) {
        // ค้นหา User จาก Database
        User user = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + studentId));

        // เรียกใช้เมธอด createItem ใน User Model (บังคับใส่ ownerId)
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
