package com.example.demo.repository;

import com.example.demo.model.BorrowRequest;
import com.example.demo.constant.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BorrowRequestRepository extends JpaRepository<BorrowRequest, String> {
    
    // ค้นหาประวัติหรือรายการขอยืมทั้งหมดของผู้ใช้งานคนนี้ (ในมุมมองผู้ยืม)
    List<BorrowRequest> findByBorrowerId(String borrowerId);
    
    // ค้นหาคำขอยืมทั้งหมดที่เกี่ยวข้องกับไอเท็มชิ้นนั้นๆ
    List<BorrowRequest> findByItemId(String itemId);
    
    // ค้นหาคำขอตามสถานะ (เช่น ดึงเฉพาะ PENDING ที่รอเจ้าของอนุมัติ)
    List<BorrowRequest> findByStatus(RequestStatus status);
}
