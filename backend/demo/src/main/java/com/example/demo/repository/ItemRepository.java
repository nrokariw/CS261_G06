package com.example.demo.repository;

import com.example.demo.model.Item;
import com.example.demo.constant.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository 
public interface ItemRepository extends JpaRepository<Item, String> {
    
    // ค้นหาไอเท็มทั้งหมดที่เป็นของ User คนนี้ (อ้างอิงจาก ownerId)
    List<Item> findByOwnerId(String ownerId);
    
    // ค้นหาไอเท็มตามสถานะ (เช่น ดึงเฉพาะชิ้นที่ AVAILABLE อยู่)
    List<Item> findByStatus(ItemStatus status);

}
