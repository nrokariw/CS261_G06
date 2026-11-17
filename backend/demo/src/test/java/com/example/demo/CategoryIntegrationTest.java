package com.example.demo;

import com.example.demo.config.CategorySeeder;
import com.example.demo.model.User;
import com.example.demo.repository.BorrowRequestRepository;
import com.example.demo.repository.CategoryRepository;
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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CategoryIntegrationTest {

    private static final String USER_ID = "6809000001";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CategorySeeder categorySeeder;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private BorrowRequestRepository borrowRequestRepository;

    @Autowired
    private EvidenceProofRepository evidenceProofRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private WantedPostRepository wantedPostRepository;

    @Autowired
    private LendOfferRepository lendOfferRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    private String authToken;

    private void cleanDatabase() {
        evidenceProofRepository.deleteAll();
        transactionRepository.deleteAll();
        lendOfferRepository.deleteAll();
        wantedPostRepository.deleteAll();
        borrowRequestRepository.deleteAll();
        itemRepository.deleteAll();
        categoryRepository.deleteById("MUSIC");
        categorySeeder.seedDefaultCategoriesIfEmpty();
    }

    @BeforeEach
    void setUp() {
        cleanDatabase();

        User user = userRepository.findById(USER_ID).orElseThrow();
        authToken = jwtService.generateAccessToken(user);
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    @Test
    @DisplayName("Default 4 categories should be auto-seeded and publicly accessible via GET /api/categories")
    void defaultCategoriesSeededAndPublic() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode list = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(list.size()).isGreaterThanOrEqualTo(4);
        assertThat(list.toString()).contains("STUDY", "ELECTRONICS", "SPORTS", "GENERAL");
    }

    @Test
    @DisplayName("Full dynamic category lifecycle: create -> use in item -> update -> soft delete -> reject new item -> hard delete")
    void dynamicCategoryCrudAndValidationLifecycle() throws Exception {
        // 1. Require authentication for write operations
        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "code", "MUSIC",
                                "nameTh", "เครื่องดนตรี",
                                "nameEn", "Musical Instruments"
                        ))))
                .andExpect(status().isUnauthorized());

        // 2. Create new category "MUSIC"
        mockMvc.perform(post("/api/categories")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "code", "music",
                                "nameTh", "เครื่องดนตรี",
                                "nameEn", "Musical Instruments",
                                "sortOrder", 5
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("MUSIC"))
                .andExpect(jsonPath("$.nameTh").value("เครื่องดนตรี"))
                .andExpect(jsonPath("$.nameEn").value("Musical Instruments"))
                .andExpect(jsonPath("$.active").value(true));

        // 3. Create an item using newly added "MUSIC" category
        MvcResult itemResult = mockMvc.perform(post("/api/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Acoustic Guitar",
                                "category", "MUSIC",
                                "description", "Yamaha F310"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode createdItem = objectMapper.readTree(itemResult.getResponse().getContentAsString());
        assertThat(createdItem.get("category").asText()).isEqualTo("MUSIC");

        // 4. Update category labels
        mockMvc.perform(put("/api/categories/MUSIC")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "nameTh", "เครื่องดนตรีและเสียง",
                                "nameEn", "Music & Audio"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nameTh").value("เครื่องดนตรีและเสียง"))
                .andExpect(jsonPath("$.nameEn").value("Music & Audio"));

        // 5. Soft-delete category -> hidden from active list, kept in includeInactive=true
        mockMvc.perform(delete("/api/categories/MUSIC")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("MUSIC"))
                .andExpect(jsonPath("$.deleted").value(true))
                .andExpect(jsonPath("$.hard").value(false));

        MvcResult activeAfterSoftDelete = mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(activeAfterSoftDelete.getResponse().getContentAsString()).doesNotContain("\"MUSIC\"");

        MvcResult allAfterSoftDelete = mockMvc.perform(get("/api/categories?includeInactive=true"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(allAfterSoftDelete.getResponse().getContentAsString()).contains("\"MUSIC\"");

        // 6. Creating a new item with inactive category must be rejected (400 Bad Request)
        mockMvc.perform(post("/api/items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Ukulele",
                                "category", "MUSIC",
                                "description", "Should be rejected"
                        ))))
                .andExpect(status().isBadRequest());

        // 7. Hard-delete removes row permanently from DB
        mockMvc.perform(delete("/api/categories/MUSIC?hard=true")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hard").value(true));

        assertThat(categoryRepository.findById("MUSIC")).isEmpty();
    }
}
