package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.TransactionStatus;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.Transaction;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.TransactionRepository;

import org.springframework.cglib.core.Local;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final ItemRepository itemRepository;

    public TransactionService(TransactionRepository transactionRepository,
                              BorrowRequestRepository borrowRequestRepository,
                              ItemRepository itemRepository) {
        this.transactionRepository = transactionRepository;
        this.borrowRequestRepository = borrowRequestRepository;
        this.itemRepository = itemRepository;
    }

    // 1. อนุมัติคำขอและสร้าง Transaction เริ่มต้นการยืม
    @Transactional
    public Transaction createTransactionFromRequest(String requestId) {
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Borrow Request not found"));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));

        // ดึง TransactionStatus อัตโนมัติ (ดึงตามสถานะจริงของ request)
        TransactionStatus currentStatus = request.getStatus().getInitialTransactionStatus();
        if (currentStatus == null) {
            throw new IllegalStateException("Cannot create transaction from unaccepted request");
        }

        // ดึงสถานะ Item อัตโนมัติจาก TransactionStatus อีกที
        ItemStatus nextItemStatus = currentStatus.getItemStatus(); 
        if (nextItemStatus != null) {
            item.setStatus(nextItemStatus); 
        }
        itemRepository.save(item);

        // สร้าง Transaction ใหม่โดยใช้ค่าที่ได้จาก TransactionStatus และกำหนดเวลาเป็น UTC+0
        Transaction transaction = new Transaction();
        transaction.setId(java.util.UUID.randomUUID().toString());
        transaction.setRequestId(request.getId()); // ผูกกับ Request ID
        transaction.setItemId(request.getItemId());
        transaction.setBorrowerId(request.getBorrowerId());
        transaction.setLenderId(item.getOwnerId()); // ดึงรหัสเจ้าของไอเท็มมาเป็น lenderId
        transaction.setStatus(currentStatus);
        transaction.setBorrowedAt(LocalDateTime.now(ZoneOffset.UTC)); 
        transaction.setReturnedAt(null);

        return transactionRepository.save(transaction);
    }

    // 2. บันทึกการคืนสินค้า (Complete Transaction)
    @Transactional
    public Transaction completeTransaction(String transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        Item item = itemRepository.findById(transaction.getItemId())
                .orElseThrow(() -> new RuntimeException("Item not found"));

        
        // อัปเดตสถานะ Transaction เป็นเสร็จสิ้น
        transaction.completeTransaction();

        // ดึงสถานะ Item อัตโนมัติ ของ TransactionStatus (จะได้ ItemStatus.AVAILABLE)
        ItemStatus nextItemStatus = transaction.getStatus().getItemStatus(); 
        if (nextItemStatus != null) {
            item.setStatus(nextItemStatus); 
        }

        itemRepository.save(item);
        return transactionRepository.save(transaction);
    }

    // 3.ค้นหาประวัติธุรกรรมทั้งหมดของผู้ยืม
    public List<Transaction> getTransactionsByBorrower(String borrowerId) {
        return transactionRepository.findByBorrowerId(borrowerId);
    }

    // 4.ค้นหาประวัติธุรกรรมของไอเท็มชิ้นนั้นๆ
    public List<Transaction> getTransactionsByItem(String itemId) {
        return transactionRepository.findByItemId(itemId);
    }
}
