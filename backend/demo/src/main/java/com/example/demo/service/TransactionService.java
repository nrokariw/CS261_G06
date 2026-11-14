package com.example.demo.service;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.ProofType;
import com.example.demo.constant.RequestStatus;
import com.example.demo.constant.TransactionStatus;
import com.example.demo.dto.HandoverRequestDto;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.EvidenceProof;
import com.example.demo.model.Item;
import com.example.demo.model.Transaction;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.EvidenceProofRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.TransactionRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class TransactionService {

    //define attributes
    private final TransactionRepository transactionRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final ItemRepository itemRepository;
    private final EvidenceProofRepository evidenceProofRepository;
    private final FileStorageService fileStorageService;

    //define constructor
    public TransactionService(TransactionRepository transactionRepository,
                              BorrowRequestRepository borrowRequestRepository,
                              ItemRepository itemRepository,
                              EvidenceProofRepository evidenceProofRepository,
                              FileStorageService fileStorageService) {
        this.transactionRepository = transactionRepository;
        this.borrowRequestRepository = borrowRequestRepository;
        this.itemRepository = itemRepository;
        this.evidenceProofRepository = evidenceProofRepository;
        this.fileStorageService = fileStorageService;
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

    /**
     * T-6.2: บันทึกหลักฐานการส่งมอบสิ่งของ (Handover Evidence) พร้อมอัปโหลดรูปภาพ
     */
    @Transactional
    public Transaction createHandoverEvidence(String requestId, String currentUserId, HandoverRequestDto dto) {
        // 1. ตรวจสอบว่ามีการแนบรูปภาพมาหรือไม่ (400 Bad Request)
        if (dto.getImageFile() == null || dto.getImageFile().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาแนบรูปภาพสภาพสิ่งของ");
        }

        // 2. ค้นหาข้อมูลคำขอยืมและไอเท็ม
        BorrowRequest request = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบข้อมูลคำขอยืม"));

        Item item = itemRepository.findById(request.getItemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบข้อมูลสิ่งของ"));

        // 3. ตรวจสอบสิทธิ์คู่กรณี: User ต้องเป็น Borrower หรือ Owner (Lender) ของไอเท็มเท่านั้น (403 Forbidden)
        boolean isBorrower = request.getBorrowerId().equals(currentUserId);
        boolean isLender = item.getOwnerId().equals(currentUserId);
        if (!isBorrower && !isLender) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ผู้ใช้งานไม่มีสิทธิ์บันทึกหลักฐานในรายการยืมนี้");
        }

        // 4. ตรวจสอบสถานะคำขอต้องเป็น ACCEPTED เท่านั้น (409 Conflict)
        if (request.getStatus() != RequestStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "สถานะรายการไม่ถูกต้อง (ต้องเป็น Accepted เท่านั้น)");
        }

        // 5. อัปโหลดไฟล์รูปภาพผ่าน FileStorageService (ตรวจสอบ Mime-type และ Size ภายในตัว หากไม่ผ่านจะโยน 400 Bad Request)
        String imageUrl = fileStorageService.storeFile(dto.getImageFile());

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        // 6. สร้างและบันทึกข้อมูลลงตาราง borrowing_transaction
        Transaction transaction = new Transaction();
        transaction.setId(java.util.UUID.randomUUID().toString());
        transaction.setRequestId(request.getId());
        transaction.setItemId(request.getItemId());
        transaction.setBorrowerId(request.getBorrowerId());
        transaction.setLenderId(item.getOwnerId());
        transaction.setStatus(TransactionStatus.ACTIVE);
        transaction.setBorrowedAt(now);
        transaction.setReturnedAt(null);
        Transaction savedTransaction = transactionRepository.save(transaction);

        // 7. บันทึกหลักฐานรูปลงตาราง evidence_proof (ProofType.HANDOVER)
        EvidenceProof proof = new EvidenceProof();
        proof.setId(java.util.UUID.randomUUID().toString());
        proof.setTransactionId(savedTransaction.getId());
        proof.setUploaderId(currentUserId);
        proof.setProofType(ProofType.HANDOVER);
        proof.setImageUrl(imageUrl);
        proof.setNote(dto.getConditionNote());
        proof.setCapturedAt(now);
        evidenceProofRepository.save(proof);

        // 8. อัปเดตสถานะของสิ่งของเป็น BORROWED
        item.setStatus(ItemStatus.BORROWED);
        itemRepository.save(item);

        return savedTransaction;
    }

}
