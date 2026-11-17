package com.example.demo;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.LendOfferStatus;
import com.example.demo.constant.RequestStatus;
import com.example.demo.constant.WantedPostStatus;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.EvidenceProofRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.LendOfferRepository;
import com.example.demo.repository.TransactionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WantedPostRepository;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class WantedPostIntegrationTest {

    private static final String REQUESTER_ID = "6809000002"; // Borrower wanting an item
    private static final String LENDER_ID = "6809000001";    // Owner offering an item
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
    private WantedPostRepository wantedPostRepository;

    @Autowired
    private LendOfferRepository lendOfferRepository;

    @Autowired
    private EvidenceProofRepository evidenceProofRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String requesterToken;
    private String lenderToken;
    private String outsiderToken;
    private Item lenderItem;

    private void cleanDatabase() {
        evidenceProofRepository.deleteAll();
        transactionRepository.deleteAll();
        lendOfferRepository.deleteAll();
        wantedPostRepository.deleteAll();
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

        User requester = userRepository.findById(REQUESTER_ID).orElseThrow();
        User lender = userRepository.findById(LENDER_ID).orElseThrow();
        User outsider = userRepository.findById(OUTSIDER_ID).orElseThrow();

        requesterToken = jwtService.generateAccessToken(requester);
        lenderToken = jwtService.generateAccessToken(lender);
        outsiderToken = jwtService.generateAccessToken(outsider);

        lenderItem = new Item();
        lenderItem.setId(UUID.randomUUID().toString());
        lenderItem.setOwnerId(LENDER_ID);
        lenderItem.setTitle("Scientific Calculator fx-991");
        lenderItem.setCategory("electronics");
        lenderItem.setDescription("Ready to lend");
        lenderItem.setStatus(ItemStatus.AVAILABLE);
        lenderItem.setCreatedAt(LocalDateTime.now());
        itemRepository.save(lenderItem);
    }

    @Test
    @DisplayName("US-BRRQS: create wanted post, submit lend offer with item, and accept creates ACCEPTED BorrowRequest")
    void createOfferAndAcceptMatchesBorrowRequest() throws Exception {
        // 1. Requester creates wanted post
        MvcResult createRes = mockMvc.perform(post("/api/wanted-posts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "ต้องการยืมเครื่องคิดเลขวิทยาศาสตร์",
                                "category", "electronics",
                                "description", "ใช้สอบกลางภาค 2 วัน"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("open"))
                .andReturn();

        String postId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asText();

        // 2. Public browse shows the wanted post
        mockMvc.perform(get("/api/wanted-posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(postId));

        // 3. Requester cannot offer on own wanted post (400 Bad Request)
        mockMvc.perform(post("/api/wanted-posts/" + postId + "/offers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("message", "self offer"))))
                .andExpect(status().isBadRequest());

        // 3.5. Lender cannot submit an offer without selecting an item (400 Bad Request)
        mockMvc.perform(post("/api/wanted-posts/" + postId + "/offers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("message", "no item"))))
                .andExpect(status().isBadRequest());

        // 4. Lender submits offer with an AVAILABLE item
        MvcResult offerRes = mockMvc.perform(post("/api/wanted-posts/" + postId + "/offers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "offeredItemId", lenderItem.getId(),
                                "message", "มีให้ยืม นัดรับที่ SC ได้ครับ"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending"))
                .andReturn();

        String offerId = objectMapper.readTree(offerRes.getResponse().getContentAsString()).get("id").asText();

        // 5. Outsider cannot accept the offer (403 Forbidden)
        mockMvc.perform(post("/api/wanted-posts/" + postId + "/offers/" + offerId + "/accept")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());

        // 6. Requester accepts offer -> WantedPost FULFILLED, Item RESERVED, BorrowRequest ACCEPTED
        MvcResult acceptRes = mockMvc.perform(post("/api/wanted-posts/" + postId + "/offers/" + offerId + "/accept")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.post.status").value("fulfilled"))
                .andExpect(jsonPath("$.acceptedOffer.status").value("accepted"))
                .andExpect(jsonPath("$.borrowRequestId").isNotEmpty())
                .andExpect(jsonPath("$.borrowRequest.status").value("ACCEPTED"))
                .andReturn();

        JsonNode acceptJson = objectMapper.readTree(acceptRes.getResponse().getContentAsString());
        String borrowRequestId = acceptJson.get("borrowRequestId").asText();

        BorrowRequest createdReq = borrowRequestRepository.findById(borrowRequestId).orElseThrow();
        assertThat(createdReq.getStatus()).isEqualTo(RequestStatus.ACCEPTED);
        assertThat(createdReq.getBorrowerId()).isEqualTo(REQUESTER_ID);
        assertThat(createdReq.getItemId()).isEqualTo(lenderItem.getId());

        assertThat(itemRepository.findById(lenderItem.getId()).orElseThrow().getStatus())
                .isEqualTo(ItemStatus.RESERVED);
        assertThat(wantedPostRepository.findById(postId).orElseThrow().getStatus())
                .isEqualTo(WantedPostStatus.FULFILLED);
        assertThat(lendOfferRepository.findById(offerId).orElseThrow().getStatus())
                .isEqualTo(LendOfferStatus.ACCEPTED);
    }

    @Test
    @DisplayName("US-BRRQS: non-owner cannot edit or cancel a wanted post")
    void nonOwnerCannotEditOrCancelWantedPost() throws Exception {
        MvcResult createRes = mockMvc.perform(post("/api/wanted-posts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "ขาตั้งกล้อง",
                                "category", "electronics"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        String postId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(put("/api/wanted-posts/" + postId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "แก้ไขโดยคนอื่น",
                                "category", "electronics"
                        ))))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/wanted-posts/" + postId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("US-BRRQS (#124): resetting an offer-created borrow request to pending reverts offer to PENDING and post to OPEN")
    void resettingOfferCreatedBorrowRequestRevertsOfferAndReopensPost() throws Exception {
        MvcResult createRes = mockMvc.perform(post("/api/wanted-posts")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "เครื่องคิดเลขวิทยาศาสตร์",
                                "category", "electronics"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        String postId = objectMapper.readTree(createRes.getResponse().getContentAsString()).get("id").asText();

        MvcResult offerRes = mockMvc.perform(post("/api/wanted-posts/" + postId + "/offers")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "offeredItemId", lenderItem.getId(),
                                "message", "ให้ยืมได้ครับ"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        String offerId = objectMapper.readTree(offerRes.getResponse().getContentAsString()).get("id").asText();

        MvcResult acceptRes = mockMvc.perform(post("/api/wanted-posts/" + postId + "/offers/" + offerId + "/accept")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + requesterToken))
                .andExpect(status().isOk())
                .andReturn();

        String borrowRequestId = objectMapper.readTree(acceptRes.getResponse().getContentAsString())
                .get("borrowRequestId").asText();

        mockMvc.perform(post("/api/requests/" + borrowRequestId + "/reset")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + lenderToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        assertThat(lendOfferRepository.findById(offerId).orElseThrow().getStatus())
                .isEqualTo(LendOfferStatus.PENDING);
        assertThat(wantedPostRepository.findById(postId).orElseThrow().getStatus())
                .isEqualTo(WantedPostStatus.OPEN);
        assertThat(itemRepository.findById(lenderItem.getId()).orElseThrow().getStatus())
                .isEqualTo(ItemStatus.AVAILABLE);
    }
}
