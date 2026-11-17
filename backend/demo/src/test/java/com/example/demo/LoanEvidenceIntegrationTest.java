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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class LoanEvidenceIntegrationTest {

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

    private BorrowRequest testRequest;
    private Transaction testTransaction;
    private String lenderToken;
    private String borrowerToken;
    private String outsiderToken;

    @BeforeEach
    void setUp() {
        evidenceProofRepository.deleteAll();
        transactionRepository.deleteAll();
        borrowRequestRepository.deleteAll();
        itemRepository.deleteAll();

        User lender = userRepository.findById(LENDER_ID).orElseThrow();
        User borrower = userRepository.findById(BORROWER_ID).orElseThrow();
        User outsider = userRepository.findById(OUTSIDER_ID).orElseThrow();
        lenderToken = jwtService.generateAccessToken(lender);
        borrowerToken = jwtService.generateAccessToken(borrower);
        outsiderToken = jwtService.generateAccessToken(outsider);

        Item item = new Item();
        item.setId(UUID.randomUUID().toString());
        item.setTitle("Casio fx-991EX");
        item.setCategory("electronics");
        item.setOwnerId(LENDER_ID);
        item.setStatus(ItemStatus.AVAILABLE);
        itemRepository.save(item);

        testRequest = new BorrowRequest();
        testRequest.setId(UUID.randomUUID().toString());
        testRequest.setItemId(item.getId());
        testRequest.setBorrowerId(BORROWER_ID);
        testRequest.setStartDate(LocalDateTime.now().minusDays(2));
        testRequest.setEndDate(LocalDateTime.now());
        testRequest.setReason("ใช้สอบกลางภาค");
        testRequest.setStatus(RequestStatus.ACCEPTED);
        borrowRequestRepository.save(testRequest);

        testTransaction = new Transaction();
        testTransaction.setId(UUID.randomUUID().toString());
        testTransaction.setBorrowRequest(testRequest);
        testTransaction.setBorrowerId(BORROWER_ID);
        testTransaction.setLenderId(LENDER_ID);
        testTransaction.setItemId(item.getId());
        testTransaction.setStatus(TransactionStatus.COMPLETED);
        testTransaction.setBorrowedAt(LocalDateTime.now().minusDays(2));
        testTransaction.setReturnedAt(LocalDateTime.now());
        transactionRepository.save(testTransaction);

        EvidenceProof handoverProof = new EvidenceProof();
        handoverProof.setId(UUID.randomUUID().toString());
        handoverProof.setTransaction(testTransaction);
        handoverProof.setUploaderId(LENDER_ID);
        handoverProof.setProofType(ProofType.HANDOVER);
        handoverProof.setImageUrl("/uploads/evidence/handover.png");
        handoverProof.setNote("สภาพปกติ");
        handoverProof.setCapturedAt(LocalDateTime.now().minusDays(2));
        evidenceProofRepository.save(handoverProof);

        EvidenceProof returnProof = new EvidenceProof();
        returnProof.setId(UUID.randomUUID().toString());
        returnProof.setTransaction(testTransaction);
        returnProof.setUploaderId(BORROWER_ID);
        returnProof.setProofType(ProofType.RETURN);
        returnProof.setImageUrl("/uploads/evidence/return.png");
        returnProof.setNote("คืนครบเรียบร้อย");
        returnProof.setCapturedAt(LocalDateTime.now());
        evidenceProofRepository.save(returnProof);
    }

    @Test
    @DisplayName("GET /api/transactions/{id}/evidence: 200 OK for borrower and lender with full transaction and evidence list")
    void getLoanEvidenceAllowedForParties() throws Exception {
        mockMvc.perform(get("/api/transactions/" + testRequest.getId() + "/evidence")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + borrowerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestId").value(testRequest.getId()))
                .andExpect(jsonPath("$.transactionId").value(testTransaction.getId()))
                .andExpect(jsonPath("$.transactionStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.borrowerId").value(BORROWER_ID))
                .andExpect(jsonPath("$.ownerId").value(LENDER_ID))
                .andExpect(jsonPath("$.handoverImageUrl").value("/uploads/evidence/handover.png"))
                .andExpect(jsonPath("$.returnImageUrl").value("/uploads/evidence/return.png"))
                .andExpect(jsonPath("$.evidences", hasSize(2)));

        // Lookup by transactionId as well
        mockMvc.perform(get("/api/transactions/" + testTransaction.getId() + "/evidence")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestId").value(testRequest.getId()))
                .andExpect(jsonPath("$.evidences", hasSize(2)));
    }

    @Test
    @DisplayName("GET /api/transactions/{id}/evidence: 401 Unauthorized when unauthenticated")
    void getLoanEvidenceUnauthorized() throws Exception {
        mockMvc.perform(get("/api/transactions/" + testRequest.getId() + "/evidence"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/transactions/{id}/evidence: 403 Forbidden for non-party user")
    void getLoanEvidenceForbiddenForOutsider() throws Exception {
        mockMvc.perform(get("/api/transactions/" + testRequest.getId() + "/evidence")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/transactions/borrower/" + BORROWER_ID)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/transactions/{id}/evidence: 404 Not Found when request or transaction does not exist")
    void getLoanEvidenceNotFound() throws Exception {
        mockMvc.perform(get("/api/transactions/" + UUID.randomUUID() + "/evidence")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + borrowerToken))
                .andExpect(status().isNotFound());
    }
}
