package com.example.demo;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.ProofType;
import com.example.demo.constant.RequestStatus;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.EvidenceProof;
import com.example.demo.model.Item;
import com.example.demo.model.Transaction;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.EvidenceProofRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.TransactionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "file.upload-dir=target/test-uploads/products",
        "file.evidence-upload-dir=target/test-uploads/evidence"
})
class HandoverEvidenceIntegrationTest {

    private static final String OWNER_ID = "6809000001";
    private static final String BORROWER_ID = "6809000002";
    private static final String OTHER_ID = "6809000003";

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

    private final ObjectMapper objectMapper = new ObjectMapper();

    private Item item;
    private BorrowRequest acceptedRequest;

    private void cleanDatabase() {
        evidenceProofRepository.deleteAll();
        transactionRepository.deleteAll();
        borrowRequestRepository.deleteAll();
        itemRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    @BeforeEach
    void setUp() {
        cleanDatabase();

        item = new Item();
        item.setId(UUID.randomUUID().toString());
        item.setOwnerId(OWNER_ID);
        item.setTitle("Test Camera");
        item.setCategory("อุปกรณ์ถ่ายภาพ");
        item.setDescription("Camera for handover test");
        item.setStatus(ItemStatus.AVAILABLE);
        item.setCreatedAt(LocalDateTime.now());
        itemRepository.save(item);

        acceptedRequest = new BorrowRequest();
        acceptedRequest.setId(UUID.randomUUID().toString());
        acceptedRequest.setItemId(item.getId());
        acceptedRequest.setBorrowerId(BORROWER_ID);
        acceptedRequest.setStartDate(LocalDateTime.now().plusDays(1));
        acceptedRequest.setEndDate(LocalDateTime.now().plusDays(3));
        acceptedRequest.setReason("ใช้ทำโปรเจกต์");
        acceptedRequest.setStatus(RequestStatus.ACCEPTED);
        acceptedRequest.setCreatedAt(LocalDateTime.now());
        borrowRequestRepository.save(acceptedRequest);
    }

    private String bearerFor(String studentId) {
        var user = userRepository.findById(studentId).orElseThrow();
        return "Bearer " + jwtService.generateAccessToken(user);
    }

    @Test
    @DisplayName("POST /api/transactions/{requestId}/handover-evidence: 201 Created, saves note & /uploads/evidence/, updates item to BORROWED, blocks duplicate with 409")
    void handoverSuccessAndPreventsDuplicate() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "handover.jpg",
                "image/jpeg",
                "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8)
        );

        MvcResult res = mockMvc.perform(
                        multipart("/api/transactions/" + acceptedRequest.getId() + "/handover-evidence")
                                .file(imageFile)
                                .param("note", "สภาพปกติ ไม่มีรอยขีดข่วน")
                                .header(HttpHeaders.AUTHORIZATION, bearerFor(BORROWER_ID))
                )
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode txJson = objectMapper.readTree(res.getResponse().getContentAsString());
        String txId = txJson.get("id").asText();
        assertThat(txJson.get("requestId").asText()).isEqualTo(acceptedRequest.getId());

        Item updatedItem = itemRepository.findById(item.getId()).orElseThrow();
        assertThat(updatedItem.getStatus()).isEqualTo(ItemStatus.BORROWED);

        List<EvidenceProof> proofs = evidenceProofRepository.findByTransactionId(txId);
        assertThat(proofs).hasSize(1);
        EvidenceProof proof = proofs.get(0);
        assertThat(proof.getProofType()).isEqualTo(ProofType.HANDOVER);
        assertThat(proof.getNote()).isEqualTo("สภาพปกติ ไม่มีรอยขีดข่วน");
        assertThat(proof.getImageUrl()).startsWith("/uploads/evidence/");

        // Duplicate submission on same requestId must return 409 Conflict
        MockMultipartFile secondImage = new MockMultipartFile(
                "imageFile",
                "handover2.jpg",
                "image/jpeg",
                "fake-jpeg-bytes-2".getBytes(StandardCharsets.UTF_8)
        );
        mockMvc.perform(
                        multipart("/api/transactions/" + acceptedRequest.getId() + "/handover-evidence")
                                .file(secondImage)
                                .param("note", "ซ้ำ")
                                .header(HttpHeaders.AUTHORIZATION, bearerFor(OWNER_ID))
                )
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/transactions/{requestId}/handover-evidence: 403 Forbidden for non-party user")
    void handoverForbiddenForThirdParty() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "handover.png",
                "image/png",
                "fake-png-bytes".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(
                        multipart("/api/transactions/" + acceptedRequest.getId() + "/handover-evidence")
                                .file(imageFile)
                                .param("note", "test")
                                .header(HttpHeaders.AUTHORIZATION, bearerFor(OTHER_ID))
                )
                .andExpect(status().isForbidden());

        assertThat(transactionRepository.count()).isZero();
    }

    @Test
    @DisplayName("POST /api/transactions/{requestId}/handover-evidence: 400 Bad Request when file is invalid or missing")
    void handoverBadRequestWhenInvalidFile() throws Exception {
        MockMultipartFile badFile = new MockMultipartFile(
                "imageFile",
                "bad.txt",
                "text/plain",
                "not-an-image".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(
                        multipart("/api/transactions/" + acceptedRequest.getId() + "/handover-evidence")
                                .file(badFile)
                                .param("note", "bad file")
                                .header(HttpHeaders.AUTHORIZATION, bearerFor(OWNER_ID))
                )
                .andExpect(status().isBadRequest());

        assertThat(transactionRepository.count()).isZero();
        assertThat(evidenceProofRepository.count()).isZero();
    }

    @Test
    @DisplayName("POST /api/transactions/{requestId}/handover-evidence: 409 Conflict when request is not ACCEPTED")
    void handoverConflictWhenRequestNotAccepted() throws Exception {
        acceptedRequest.setStatus(RequestStatus.PENDING);
        borrowRequestRepository.save(acceptedRequest);

        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "handover.webp",
                "image/webp",
                "fake-webp-bytes".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(
                        multipart("/api/transactions/" + acceptedRequest.getId() + "/handover-evidence")
                                .file(imageFile)
                                .param("note", "pending")
                                .header(HttpHeaders.AUTHORIZATION, bearerFor(OWNER_ID))
                )
                .andExpect(status().isConflict());

        assertThat(transactionRepository.count()).isZero();
    }

    @Test
    @DisplayName("POST /api/transactions/{requestId}/handover-evidence: 201 Created when item is RESERVED after approval")
    void handoverSucceedsWhenItemIsReservedAfterApproval() throws Exception {
        item.setStatus(ItemStatus.RESERVED);
        itemRepository.save(item);

        MockMultipartFile imageFile = new MockMultipartFile(
                "imageFile",
                "handover-reserved.jpg",
                "image/jpeg",
                "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(
                        multipart("/api/transactions/" + acceptedRequest.getId() + "/handover-evidence")
                                .file(imageFile)
                                .param("note", "ส่งมอบจากสถานะ RESERVED")
                                .header(HttpHeaders.AUTHORIZATION, bearerFor(OWNER_ID))
                )
                .andExpect(status().isCreated());

        assertThat(itemRepository.findById(item.getId()).orElseThrow().getStatus())
                .isEqualTo(ItemStatus.BORROWED);
    }
}
