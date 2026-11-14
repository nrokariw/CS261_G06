package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.TransactionStatus;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.Transaction;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.TransactionRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class TransactionService {

    //define attributes
    private final TransactionRepository transactionRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final ItemRepository itemRepository;

    //define constructor
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

    // 3.1. ค้นหาประวัติธุรกรรมทั้งหมดของผู้ยืม
    public List<Transaction> getTransactionsByBorrower(String borrowerId) {
        return transactionRepository.findByBorrowerId(borrowerId);
    }

    // 3.2. ค้นหาประวัติธุรกรรมของไอเท็มชิ้นนั้นๆ
    public List<Transaction> getTransactionsByItem(String itemId) {
        return transactionRepository.findByItemId(itemId);
    }

    // T-7.1: บันทึกหลักฐานการส่งคืนสิ่งของและอัปเดตสถานะ
    @Transactional
    public Transaction submitReturnEvidence(String requestId, String currentUserId, com.example.demo.dto.ReturnRequestDto dto) {
        // 1. ตรวจสอบไฟล์รูปภาพ (400 Bad Request หากไม่แนบไฟล์หรือไฟล์ว่าง)
        if (dto.getImageFile() == null || dto.getImageFile().isEmpty()) {
            throw new IllegalArgumentException("กรุณาแนบรูปภาพหลักฐานสภาพสิ่งของตอนส่งคืน");
        }

        // 2. ค้นหา Transaction จาก requestId
        Transaction transaction = transactionRepository.findByRequestId(requestId)
                .orElseThrow(() -> new RuntimeException("ไม่พบประวัติธุรกรรมการยืมสำหรับคำขอนี้"));

        // 3. ค้นหา Item ที่เกี่ยวข้อง
        Item item = itemRepository.findById(transaction.getItemId())
                .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลสิ่งของ"));

        // 4. ตรวจสอบสิทธิ์คู่กรณี (User ต้องเป็น borrowerId หรือ lenderId เท่านั้น) -> 403 Forbidden
        boolean isBorrower = transaction.getBorrowerId().equals(currentUserId);
        boolean isLender = transaction.getLenderId().equals(currentUserId);
        if (!isBorrower && !isLender) {
            throw new SecurityException("ผู้ใช้งานไม่มีสิทธิ์บันทึกการส่งคืนในรายการนี้");
        }

        // 5. ตรวจสอบสถานะรายการยืมต้องอยู่ในสถานะ ACTIVE (กำลังยืม) -> 409 Conflict
        if (transaction.getStatus() != TransactionStatus.ACTIVE) {
            throw new IllegalStateException("สถานะรายการไม่ถูกต้องสำหรับการส่งคืน (รายการไม่ได้อยู่ในสถานะกำลังยืม)");
        }

        // 6. อัปโหลดไฟล์รูปภาพหลักฐานผ่าน FileStorageService (มีการตรวจสอบ Mime-type และขนาดไม่เกิน 3MB ภายในตัว)
        String imageUrl = fileStorageService.storeFile(dto.getImageFile());

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        // 7. บันทึก EvidenceProof (ProofType.RETURN)
        com.example.demo.model.EvidenceProof proof = new com.example.demo.model.EvidenceProof();
        proof.setTransactionId(transaction.getId());
        proof.setUploaderId(currentUserId);
        proof.setProofType(com.example.demo.constant.ProofType.RETURN);
        proof.setImageUrl(imageUrl);
        proof.setNote(dto.getNote());
        proof.setCapturedAt(now);
        evidenceProofRepository.save(proof);

        // 8. อัปเดตสถานะ Transaction เป็น COMPLETED และบันทึกเวลา returnedAt
        transaction.completeTransaction();
        transactionRepository.save(transaction);

        // 9. เปลี่ยนสถานะสิ่งของกลับเป็น AVAILABLE
        item.setStatus(ItemStatus.AVAILABLE);
        item.setUpdatedAt(now);
        itemRepository.save(item);

        return transaction;
    }

}
