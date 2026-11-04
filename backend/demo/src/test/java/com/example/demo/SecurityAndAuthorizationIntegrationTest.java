package com.example.demo;

import com.example.demo.constant.ItemStatus;
import com.example.demo.constant.RequestStatus;
import com.example.demo.model.BorrowRequest;
import com.example.demo.model.Item;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.ItemRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.JwtService;
import com.example.demo.service.TuAuthClient;
import com.example.demo.service.TuAuthClient.TuUserProfile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
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

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityAndAuthorizationIntegrationTest {

    private static final String USER_A = "6809000001"; // Ploy S.
    private static final String USER_B = "6809000002"; // Boom N.
    private static final String USER_C = "6809000003"; // Somchai K.
    private static final String DEFAULT_PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private BorrowRequestRepository borrowRequestRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TuAuthClient tuAuthClient;

    private String tokenA;
    private String tokenB;
    private String tokenC;

    @BeforeEach
    void setUp() {
        borrowRequestRepository.deleteAll();
        itemRepository.deleteAll();

        User userA = userRepository.findById(USER_A).orElseThrow();
        User userB = userRepository.findById(USER_B).orElseThrow();
        User userC = userRepository.findById(USER_C).orElseThrow();

        tokenA = jwtService.generateAccessToken(userA);
        tokenB = jwtService.generateAccessToken(userB);
        tokenC = jwtService.generateAccessToken(userC);
    }

    private Item createItemOwnedBy(String ownerId, String title) {
        Item item = new Item();
        item.setOwnerId(ownerId);
        item.setTitle(title);
        item.setCategory("electronics");
        item.setDescription("Test item description");
        item.setStatus(ItemStatus.AVAILABLE);
        return itemRepository.save(item);
    }

    private BorrowRequest createPendingRequest(String itemId, String borrowerId) {
        BorrowRequest req = new BorrowRequest(
                null,
                itemId,
                borrowerId,
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(3),
                "Need for class lab",
                RequestStatus.PENDING,
                LocalDateTime.now()
        );
        return borrowRequestRepository.save(req);
    }

    // =========================================================================
    // Category 1: Cross-Account IDOR & Ownership Bypass (TC-SEC-01 to TC-SEC-05)
    // =========================================================================

    @Test
    @DisplayName("TC-SEC-01: Cross-Account Approve/Reject must be rejected with 403 Forbidden")
    void tcSec01_crossAccountApproveAndReject() throws Exception {
        Item itemOwnedByB = createItemOwnedBy(USER_B, "iPad Pro Owned By B");
        BorrowRequest requestByC = createPendingRequest(itemOwnedByB.getId(), USER_C);

        // User A attempts to approve a request on User B's item -> 403 Forbidden
        mockMvc.perform(post("/api/requests/{id}/approve", requestByC.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .param("ownerId", USER_B))
                .andExpect(status().isForbidden());

        // User A attempts to reject a request on User B's item -> 403 Forbidden
        mockMvc.perform(post("/api/requests/{id}/reject", requestByC.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .param("ownerId", USER_B))
                .andExpect(status().isForbidden());

        // Verify state remained PENDING and AVAILABLE
        assertThat(borrowRequestRepository.findById(requestByC.getId()).orElseThrow().getStatus())
                .isEqualTo(RequestStatus.PENDING);
        assertThat(itemRepository.findById(itemOwnedByB.getId()).orElseThrow().getStatus())
                .isEqualTo(ItemStatus.AVAILABLE);
    }

    @Test
    @DisplayName("TC-SEC-02: Cross-Account Cancel Request by non-borrower must be rejected with 403 Forbidden")
    void tcSec02_crossAccountCancelRequest() throws Exception {
        Item itemOwnedByA = createItemOwnedBy(USER_A, "Scientific Calculator");
        BorrowRequest requestByB = createPendingRequest(itemOwnedByA.getId(), USER_B);

        // User C attempts to cancel User B's borrow request -> 403 Forbidden
        mockMvc.perform(post("/api/requests/{id}/cancel", requestByB.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenC))
                .andExpect(status().isForbidden());

        // Even Item Owner (User A) cannot call borrower's cancel endpoint -> 403 Forbidden
        mockMvc.perform(post("/api/requests/{id}/cancel", requestByB.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isForbidden());

        assertThat(borrowRequestRepository.findById(requestByB.getId()).orElseThrow().getStatus())
                .isEqualTo(RequestStatus.PENDING);
    }

    @Test
    @DisplayName("TC-SEC-03: Cross-Account Item Edit/Delete must be rejected with 403 Forbidden")
    void tcSec03_crossAccountItemEditAndDelete() throws Exception {
        Item itemOwnedByB = createItemOwnedBy(USER_B, "DSLR Camera");

        // User A attempts to edit User B's item -> 403 Forbidden
        mockMvc.perform(put("/api/items/{id}", itemOwnedByB.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Hacked Title",
                                "category", "electronics",
                                "description", "Hacked"
                        ))))
                .andExpect(status().isForbidden());

        // User A attempts to delete User B's item -> 403 Forbidden
        mockMvc.perform(delete("/api/items/{id}", itemOwnedByB.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isForbidden());

        Item unchanged = itemRepository.findById(itemOwnedByB.getId()).orElseThrow();
        assertThat(unchanged.getTitle()).isEqualTo("DSLR Camera");
        assertThat(unchanged.getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("TC-SEC-04: Identity Spoofing in Body/URL must enforce JWT identity only")
    void tcSec04_identitySpoofingInBodyAndUrl() throws Exception {
        // 1. User A tries to create an item while passing User B's ID in the URL path
        MvcResult createItemResult = mockMvc.perform(post("/api/items/{studentId}", USER_B)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "USB-C Hub",
                                "category", "electronics",
                                "description", "Multiport adapter"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode createdItemNode = objectMapper.readTree(createItemResult.getResponse().getContentAsString());
        // Must record User A (from JWT), not User B (from spoofed URL)
        assertThat(createdItemNode.get("ownerId").asText()).isEqualTo(USER_A);

        // 2. User B creates an item, and User A tries to borrow it while spoofing User C as borrowerId in JSON body
        Item itemOwnedByB = createItemOwnedBy(USER_B, "Tripod Stand");
        MvcResult borrowResult = mockMvc.perform(post("/api/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "itemId", itemOwnedByB.getId(),
                                "borrowerId", USER_C,
                                "startDate", LocalDateTime.now().plusDays(1).toString(),
                                "endDate", LocalDateTime.now().plusDays(2).toString(),
                                "reason", "Photography project"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode createdReqNode = objectMapper.readTree(borrowResult.getResponse().getContentAsString());
        // Must record User A (from JWT), ignoring spoofed USER_C in body
        assertThat(createdReqNode.get("borrowerId").asText()).isEqualTo(USER_A);
    }

    @Test
    @DisplayName("TC-SEC-05: Self-Borrow API Bypass must be rejected with 400 Bad Request")
    void tcSec05_selfBorrowBypassRejected() throws Exception {
        Item itemOwnedByA = createItemOwnedBy(USER_A, "Lab Coat");

        mockMvc.perform(post("/api/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "itemId", itemOwnedByA.getId(),
                                "borrowerId", USER_B, // Even if spoofing USER_B, JWT is USER_A (the owner)
                                "startDate", LocalDateTime.now().plusDays(1).toString(),
                                "endDate", LocalDateTime.now().plusDays(2).toString(),
                                "reason", "Trying to borrow my own item"
                        ))))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================
    // Category 2: JWT & Refresh Token Security (TC-SEC-06 to TC-SEC-09)
    // =========================================================================

    @Test
    @DisplayName("TC-SEC-06: Tampered JWT Payload, Invalid Signature, or alg:none must return 401 Unauthorized")
    void tcSec06_jwtTamperingAndAlgNoneRejected() throws Exception {
        String[] parts = tokenA.split("\\.");
        // Tamper payload: change sub from USER_A to USER_B without re-signing with valid secret
        String tamperedPayloadJson = "{\"sub\":\"" + USER_B + "\",\"role\":\"ADMIN\",\"exp\":9999999999}";
        String tamperedPayloadB64 = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(tamperedPayloadJson.getBytes(StandardCharsets.UTF_8));
        String tamperedToken = parts[0] + "." + tamperedPayloadB64 + "." + parts[2];

        mockMvc.perform(post("/api/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tamperedToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Tampered Item",
                                "category", "books"
                        ))))
                .andExpect(status().isUnauthorized());

        // Construct alg:none unsigned token
        String noneHeaderB64 = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String algNoneToken = noneHeaderB64 + "." + tamperedPayloadB64 + ".";

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + algNoneToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-SEC-07: Refresh Token Replay Attack (reusing rotated refresh token) must return 401 Unauthorized")
    void tcSec07_refreshTokenReplayAttackRejected() throws Exception {
        // 1. Login as User A to obtain initial refresh_token cookie (#1)
        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", USER_A,
                                "password", DEFAULT_PASSWORD
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie1 = loginRes.getResponse().getCookie("refresh_token");
        assertThat(refreshCookie1).isNotNull();
        assertThat(refreshCookie1.isHttpOnly()).isTrue();

        // 2. Call /api/auth/refresh with refreshCookie1 -> rotates and returns refreshCookie2
        MvcResult refreshRes = mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie1))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie2 = refreshRes.getResponse().getCookie("refresh_token");
        assertThat(refreshCookie2).isNotNull();
        assertThat(refreshCookie2.getValue()).isNotEqualTo(refreshCookie1.getValue());

        // 3. Replay old refreshCookie1 -> must be rejected with 401 Unauthorized
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie1))
                .andExpect(status().isUnauthorized());

        // 4. Verify replay detection also invalidated refreshCookie2 for safety
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie2))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-SEC-08: Post-Logout Refresh Token reuse must return 401 Unauthorized")
    void tcSec08_postLogoutRefreshRejected() throws Exception {
        MvcResult loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", USER_A,
                                "password", DEFAULT_PASSWORD
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginRes.getResponse().getCookie("refresh_token");
        assertThat(refreshCookie).isNotNull();

        // Logout revokes the token in DB
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(refreshCookie))
                .andExpect(status().isOk());

        // Attempting to refresh with the logged-out cookie -> 401 Unauthorized
        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-SEC-09: Expired or Missing Access Token on Protected API must return 401 Unauthorized")
    void tcSec09_expiredOrMissingAccessTokenRejected() throws Exception {
        User userA = userRepository.findById(USER_A).orElseThrow();
        String expiredToken = jwtService.generateAccessTokenWithOffset(userA, -60_000L);

        // Missing token on protected endpoint -> 401 Unauthorized
        mockMvc.perform(post("/api/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "No Token Item",
                                "category", "books"
                        ))))
                .andExpect(status().isUnauthorized());

        // Expired token on protected endpoint -> 401 Unauthorized
        mockMvc.perform(post("/api/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expiredToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Expired Token Item",
                                "category", "books"
                        ))))
                .andExpect(status().isUnauthorized());

        // Guest browse without token on public GET /api/items -> 200 OK
        mockMvc.perform(get("/api/items"))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // Category 3: State Transition Bypass (TC-SEC-10 to TC-SEC-11)
    // =========================================================================

    @Test
    @DisplayName("TC-SEC-10: Borrowing a non-available (RESERVED) item must return 409 Conflict")
    void tcSec10_borrowNonAvailableItemConflict() throws Exception {
        Item itemOwnedByA = createItemOwnedBy(USER_A, "Projector");
        BorrowRequest requestByB = createPendingRequest(itemOwnedByA.getId(), USER_B);

        // Owner A approves User B's request -> Item becomes RESERVED
        mockMvc.perform(post("/api/requests/{id}/approve", requestByB.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());

        // User C attempts to borrow the already RESERVED item -> 409 Conflict
        mockMvc.perform(post("/api/requests")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenC)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "itemId", itemOwnedByA.getId(),
                                "startDate", LocalDateTime.now().plusDays(1).toString(),
                                "endDate", LocalDateTime.now().plusDays(2).toString(),
                                "reason", "Want to borrow reserved item"
                        ))))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("TC-SEC-11: Approving an already Cancelled or Rejected request must return 409 Conflict")
    void tcSec11_invalidStateTransitionConflict() throws Exception {
        Item itemOwnedByA = createItemOwnedBy(USER_A, "Soldering Iron");
        BorrowRequest requestByB = createPendingRequest(itemOwnedByA.getId(), USER_B);

        // Borrower B cancels the request -> status becomes CANCELLED
        mockMvc.perform(post("/api/requests/{id}/cancel", requestByB.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isOk());

        // Owner A tries to approve the CANCELLED request -> 409 Conflict
        mockMvc.perform(post("/api/requests/{id}/approve", requestByB.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("TC-SEC-12: Cannot approve multiple requests simultaneously for the same item")
    void tcSec12_cannotApproveMultipleRequestsForSameItem() throws Exception {
        Item itemOwnedByA = createItemOwnedBy(USER_A, "Graphing Calculator");
        BorrowRequest req1 = createPendingRequest(itemOwnedByA.getId(), USER_B);
        BorrowRequest req2 = createPendingRequest(itemOwnedByA.getId(), USER_C);

        // Owner approves req1 -> 200 OK, item becomes RESERVED
        mockMvc.perform(post("/api/requests/{id}/approve", req1.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());

        // Owner attempts to approve req2 for the same item -> 409 Conflict
        mockMvc.perform(post("/api/requests/{id}/approve", req2.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isConflict());

        assertThat(borrowRequestRepository.findById(req1.getId()).orElseThrow().getStatus())
                .isEqualTo(RequestStatus.ACCEPTED);
        assertThat(borrowRequestRepository.findById(req2.getId()).orElseThrow().getStatus())
                .isEqualTo(RequestStatus.PENDING);
    }

    @Test
    @DisplayName("TC-SEC-13: Reset accepted request to pending restores item to AVAILABLE and allows other approvals")
    void tcSec13_resetAcceptedRequestRestoresItemAvailability() throws Exception {
        Item itemOwnedByA = createItemOwnedBy(USER_A, "Digital Multimeter");
        BorrowRequest req1 = createPendingRequest(itemOwnedByA.getId(), USER_B);
        BorrowRequest req2 = createPendingRequest(itemOwnedByA.getId(), USER_C);

        // 1. Approve req1
        mockMvc.perform(post("/api/requests/{id}/approve", req1.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());
        assertThat(itemRepository.findById(itemOwnedByA.getId()).orElseThrow().getStatus())
                .isEqualTo(ItemStatus.RESERVED);

        // 2. Owner resets req1 back to pending -> 200 OK
        mockMvc.perform(post("/api/requests/{id}/reset", req1.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());

        assertThat(borrowRequestRepository.findById(req1.getId()).orElseThrow().getStatus())
                .isEqualTo(RequestStatus.PENDING);
        assertThat(itemRepository.findById(itemOwnedByA.getId()).orElseThrow().getStatus())
                .isEqualTo(ItemStatus.AVAILABLE);

        // 3. Now Owner can approve req2 -> 200 OK
        mockMvc.perform(post("/api/requests/{id}/approve", req2.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());
        assertThat(borrowRequestRepository.findById(req2.getId()).orElseThrow().getStatus())
                .isEqualTo(RequestStatus.ACCEPTED);
        assertThat(itemRepository.findById(itemOwnedByA.getId()).orElseThrow().getStatus())
                .isEqualTo(ItemStatus.RESERVED);
    }

    // =========================================================================
    // Category 4: TU REST API JSON Response Parsing & Upsert Verification
    // =========================================================================

    @Test
    @DisplayName("TU API Response Parsing: Parses nested data object and upserts student account")
    void tuApiVerifyResponseParsingAndUpsert() {
        String sampleTuJson = """
                {
                    "timestamp": 1582094550321,
                    "status": true,
                    "message": "Success",
                    "data": {
                            "type": "student",
                            "statusname": "ปกติ",
                            "userName": "4900557555",
                            "prefixname": "Mr",
                            "displayname_th": "เทพนที  โพธิ์จันทร์",
                            "displayname_en": "Thepnatee  Phojan",
                            "email": "thepnatee.pho@dome.tu.ac.th",
                            "faculty": "คณะวิทยาศาสตร์และเทคโนโลยี",
                            "department": "สาขาวิชาวิทยาการคอมพิวเตอร์"
                    }
                }
                """;

        Optional<TuUserProfile> parsed = tuAuthClient.parseVerifyResponse(sampleTuJson, "4900557555");
        assertThat(parsed).isPresent();
        TuUserProfile profile = parsed.get();
        assertThat(profile.userName()).isEqualTo("4900557555");
        assertThat(profile.type()).isEqualTo("student");
        assertThat(profile.displayNameTh()).isEqualTo("เทพนที โพธิ์จันทร์");
        assertThat(profile.displayNameEn()).isEqualTo("Thepnatee Phojan");
        assertThat(profile.email()).isEqualTo("thepnatee.pho@dome.tu.ac.th");
        assertThat(profile.faculty()).isEqualTo("คณะวิทยาศาสตร์และเทคโนโลยี");
        assertThat(profile.department()).isEqualTo("สาขาวิชาวิทยาการคอมพิวเตอร์");
    }
}
