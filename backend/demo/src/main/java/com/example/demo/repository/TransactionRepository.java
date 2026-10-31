package com.example.demo.repository;

import com.example.demo.model.Transaction;
import com.example.demo.constant.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, String> {
    
    // ค้นหาธุรกรรมทั้งหมดที่เกี่ยวข้องกับผู้ใช้งานคนนี้ (ในฐานะผู้ยืม)
    List<Transaction> findByBorrowerId(String borrowerId);
    
    // ค้นหาธุรกรรมของไอเท็มชิ้นนั้นๆ
    List<Transaction> findByItemId(String itemId);
    
    // ค้นหาธุรกรรมตามสถานะ (เช่น ACTIVE ที่กำลังยืมอยู่ หรือ COMPLETED ที่คืนแล้ว)
    List<Transaction> findByStatus(TransactionStatus status);
}
