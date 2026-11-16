package com.example.demo;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.ProofType;
import com.example.demo.constant.RequestStatus;
import com.example.demo.constant.TransactionStatus;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.EvidenceProof;
import com.example.demo.model.Item;
import com.example.demo.model.Transaction;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.EvidenceProofRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.TransactionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ReturnEvidenceIntegrationTest {

    private static final String LENDER_ID = "6809000001";
    private static final String BORROWER_ID = "6809000002";
    private static final String OUTSIDER_ID = "6809000003";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private BorrowRequestRepository borrowRequestRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private EvidenceProofRepository evidenceProofRepository;

    private Item testItem;
    private BorrowRequest testRequest;
    private Transaction testTransaction;
    private String lenderToken;
    private String outsiderToken;

    @BeforeEach
    void setUp() {
        User lender = userRepository.findById(LENDER_ID).orElseThrow();
        User outsider = userRepository.findById(OUTSIDER_ID).orElseThrow();
        lenderToken = jwtService.generateAccessToken(lender);
        outsiderToken = jwtService.generateAccessToken(outsider);

        testItem = new Item();
        testItem.setId(UUID.randomUUID().toString());
        testItem.setTitle("Test Return Tripod");
        testItem.setCategory("Equipment");
        testItem.setOwnerId(LENDER_ID);
        testItem.setStatus(ItemStatus.BORROWED);
        itemRepository.save(testItem);

        testRequest = new BorrowRequest();
        testRequest.setId(UUID.randomUUID().toString());
        testRequest.setItemId(testItem.getId());
        testRequest.setBorrowerId(BORROWER_ID);
        testRequest.setStartDate(LocalDateTime.now().minusDays(2));
        testRequest.setEndDate(LocalDateTime.now().plusDays(1));
        testRequest.setReason("Project shoot");
        testRequest.setStatus(RequestStatus.ACCEPTED);
        borrowRequestRepository.save(testRequest);

        testTransaction = new Transaction();
        testTransaction.setId(UUID.randomUUID().toString());
        testTransaction.setRequestId(testRequest.getId());
        testTransaction.setItemId(testItem.getId());
        testTransaction.setBorrowerId(BORROWER_ID);
        testTransaction.setLenderId(LENDER_ID);
        testTransaction.setStatus(TransactionStatus.ACTIVE);
        testTransaction.setBorrowedAt(LocalDateTime.now().minusDays(1));
        transactionRepository.save(testTransaction);
    }

    @AfterEach
    void cleanUp() throws Exception {
        List<EvidenceProof> proofs = evidenceProofRepository.findByTransactionId(testTransaction.getId());
        for (EvidenceProof proof : proofs) {
            if (proof.getImageUrl() != null && proof.getImageUrl().startsWith("/uploads/evidence/")) {
                String filename = proof.getImageUrl().substring("/uploads/evidence/".length());
                Files.deleteIfExists(Paths.get("uploads/evidence").resolve(filename));
            }
        }
        evidenceProofRepository.deleteAll(proofs);
        transactionRepository.deleteById(testTransaction.getId());
        borrowRequestRepository.deleteById(testRequest.getId());
        itemRepository.deleteById(testItem.getId());
    }

    @Test
    @DisplayName("US-07.1 Success: saves RETURN proof in /uploads/evidence, completes tx, and resets item to AVAILABLE")
    void submitReturnEvidence_SavesReturnProofAndCompletesTransaction() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "return-photo.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "return-evidence-bytes".getBytes()
        );

        mockMvc.perform(multipart("/api/transactions/request/" + testRequest.getId() + "/return-evidence")
                        .file(imageFile)
                        .param("note", "สภาพสมบูรณ์ครบถ้วน")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.returnedAt").isNotEmpty());

        Transaction updatedTx = transactionRepository.findById(testTransaction.getId()).orElseThrow();
        assertThat(updatedTx.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(updatedTx.getReturnedAt()).isNotNull();

        Item updatedItem = itemRepository.findById(testItem.getId()).orElseThrow();
        assertThat(updatedItem.getStatus()).isEqualTo(ItemStatus.AVAILABLE);

        List<EvidenceProof> proofs = evidenceProofRepository.findByTransactionId(testTransaction.getId());
        assertThat(proofs).hasSize(1);
        EvidenceProof savedProof = proofs.get(0);
        assertThat(savedProof.getProofType()).isEqualTo(ProofType.RETURN);
        assertThat(savedProof.getImageUrl()).startsWith("/uploads/evidence/");
        assertThat(savedProof.getUploaderId()).isEqualTo(LENDER_ID);
        assertThat(savedProof.getNote()).isEqualTo("สภาพสมบูรณ์ครบถ้วน");

        String storedName = savedProof.getImageUrl().substring("/uploads/evidence/".length());
        Path storedPath = Paths.get("uploads/evidence").resolve(storedName);
        assertThat(Files.exists(storedPath)).isTrue();
    }

    @Test
    @DisplayName("US-07.1 Validation: missing imageFile returns 400 Bad Request")
    void submitReturnEvidence_RejectsMissingImageWith400() throws Exception {
        mockMvc.perform(multipart("/api/transactions/request/" + testRequest.getId() + "/return-evidence")
                        .param("note", "ไม่มีรูป")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken))
                .andExpect(status().isBadRequest());

        assertThat(evidenceProofRepository.findByTransactionId(testTransaction.getId())).isEmpty();
    }

    @Test
    @DisplayName("US-07.1 Authorization: non-participant returns 403 Forbidden")
    void submitReturnEvidence_RejectsOutsiderWith403() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "return-photo.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "return-evidence-bytes".getBytes()
        );

        mockMvc.perform(multipart("/api/transactions/request/" + testRequest.getId() + "/return-evidence")
                        .file(imageFile)
                        .param("note", "บุคคลภายนอก")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());

        assertThat(evidenceProofRepository.findByTransactionId(testTransaction.getId())).isEmpty();
    }

    @Test
    @DisplayName("US-07.1 State Guard: non-ACTIVE transaction returns 409 Conflict")
    void submitReturnEvidence_RejectsNonActiveTransactionWith409() throws Exception {
        testTransaction.completeTransaction();
        transactionRepository.save(testTransaction);

        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "return-photo.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "return-evidence-bytes".getBytes()
        );

        mockMvc.perform(multipart("/api/transactions/request/" + testRequest.getId() + "/return-evidence")
                        .file(imageFile)
                        .param("note", "คืนซ้ำ")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken))
                .andExpect(status().isConflict());

        assertThat(evidenceProofRepository.findByTransactionId(testTransaction.getId())).isEmpty();
    }
}
