package com.example.demo;

import com.example.demo.config.ExternalApiProperties;
import com.example.demo.model.User;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.LoginRateLimiter;
import com.example.demo.service.TuAuthCacheService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TuAuthSyncIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ExternalApiProperties externalApiProperties;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private LoginRateLimiter loginRateLimiter;

    @Autowired
    private TuAuthCacheService tuAuthCacheService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private HttpServer mockTuServer;
    private String originalBaseUrl;
    private String originalVerifyPath;
    private String originalApiToken;
    private String originalAuthMode;

    private final AtomicReference<MockTuHandler> handlerRef = new AtomicReference<>();
    private final AtomicInteger tuApiCallCount = new AtomicInteger(0);

    @FunctionalInterface
    interface MockTuHandler {
        MockTuResponse handle(String username, String password);
    }

    record MockTuResponse(int statusCode, String body) {}

    @BeforeEach
    void setUp() throws IOException {
        loginRateLimiter.reset();
        loginRateLimiter.setMaxAttempts(5);
        tuAuthCacheService.clear();
        tuApiCallCount.set(0);

        originalBaseUrl = externalApiProperties.getTuApiBaseUrl();
        originalVerifyPath = externalApiProperties.getTuApiVerifyPath();
        originalApiToken = externalApiProperties.getTuApiToken();
        originalAuthMode = externalApiProperties.getAuthMode();

        mockTuServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        mockTuServer.createContext("/auth/Ad/verify", exchange -> {
            tuApiCallCount.incrementAndGet();
            byte[] reqBytes = exchange.getRequestBody().readAllBytes();
            JsonNode reqJson = objectMapper.readTree(new String(reqBytes, StandardCharsets.UTF_8));
            String username = reqJson.path("UserName").asText("");
            String password = reqJson.path("PassWord").asText("");

            MockTuResponse resp = handlerRef.get().handle(username, password);
            byte[] respBytes = resp.body().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(resp.statusCode(), respBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(respBytes);
            }
        });
        mockTuServer.start();

        int port = mockTuServer.getAddress().getPort();
        externalApiProperties.setTuApiBaseUrl("http://127.0.0.1:" + port);
        externalApiProperties.setTuApiVerifyPath("/auth/Ad/verify");
        externalApiProperties.setTuApiToken("TEST_KEY");
        externalApiProperties.setAuthMode("HYBRID");
    }

    @AfterEach
    void tearDown() {
        if (mockTuServer != null) {
            mockTuServer.stop(0);
        }
        externalApiProperties.setTuApiBaseUrl(originalBaseUrl);
        externalApiProperties.setTuApiVerifyPath(originalVerifyPath);
        externalApiProperties.setTuApiToken(originalApiToken);
        externalApiProperties.setAuthMode(originalAuthMode);
    }

    @Test
    @DisplayName("US-09.1 Case 1 & 2: TU student login stores no passwordHash, and subsequent login syncs updated profile & role")
    void tuLoginNeverCachesPasswordAndSyncsUpdatedProfileAndRole() throws Exception {
        String tuUser = "6809990001";
        refreshTokenRepository.deleteAll();
        userRepository.findById(tuUser).ifPresent(userRepository::delete);

        handlerRef.set((u, p) -> new MockTuResponse(200, """
                {
                  "status": true,
                  "message": "Success",
                  "type": "student",
                  "username": "6809990001",
                  "tu_status": "ปกติ",
                  "displayname_th": "นักศึกษา ทดสอบ",
                  "displayname_en": "Nuksuksa Todsob",
                  "email": "old.std@dome.tu.ac.th",
                  "department": "สาขาวิชาวิทยาการคอมพิวเตอร์",
                  "faculty": "คณะวิทยาศาสตร์และเทคโนโลยี"
                }
                """));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", tuUser, "password", "pass1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("STUDENT"))
                .andExpect(jsonPath("$.user.faculty").value("คณะวิทยาศาสตร์และเทคโนโลยี"));

        User saved = userRepository.findById(tuUser).orElseThrow();
        assertThat(saved.getAuthProvider()).isEqualTo("TU_API");
        assertThat(saved.getPasswordHash()).isNull();

        // Profile and role changed in TU Account (student -> employee)
        handlerRef.set((u, p) -> new MockTuResponse(200, """
                {
                  "status": true,
                  "message": "Success",
                  "type": "employee",
                  "username": "6809990001",
                  "StatusWork": "1",
                  "StatusEmp": "ปกติ",
                  "displayname_th": "บุคลากร อัปเดต",
                  "displayname_en": "Staff Updated",
                  "email": "staff.new@tu.ac.th",
                  "department": "งานวิเคราะห์และพัฒนาระบบ",
                  "organization": "สำนักงานศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร"
                }
                """));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", tuUser, "password", "pass2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.fullName").value("บุคลากร อัปเดต"))
                .andExpect(jsonPath("$.user.role").value("STAFF"))
                .andExpect(jsonPath("$.user.faculty").value("สำนักงานศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร"))
                .andExpect(jsonPath("$.user.department").value("งานวิเคราะห์และพัฒนาระบบ"));

        User updated = userRepository.findById(tuUser).orElseThrow();
        assertThat(updated.getRole()).isEqualTo("STAFF");
        assertThat(updated.getPasswordHash()).isNull();
    }

    @Test
    @DisplayName("US-09.1 Case 3: Changing password in TU Account rejects old password with 401 and accepts new password")
    void tuPasswordChangeRejectsOldPasswordImmediately() throws Exception {
        String tuUser = "6809990002";
        refreshTokenRepository.deleteAll();
        userRepository.findById(tuUser).ifPresent(userRepository::delete);

        AtomicReference<String> currentTuPassword = new AtomicReference<>("oldPass123");
        handlerRef.set((u, p) -> {
            if (currentTuPassword.get().equals(p)) {
                return new MockTuResponse(200, """
                        {
                          "status": true,
                          "message": "Success",
                          "type": "student",
                          "username": "6809990002",
                          "tu_status": "คงสภาพ",
                          "displayname_th": "นักศึกษา เปลี่ยนรหัส",
                          "faculty": "คณะวิทยาศาสตร์และเทคโนโลยี",
                          "department": "สาขาวิชาวิทยาการคอมพิวเตอร์"
                        }
                        """);
            }
            return new MockTuResponse(400, """
                    { "status": false, "message": "User or Password Invalid!" }
                    """);
        });

        // First login succeeds with old password
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", tuUser, "password", "oldPass123"))))
                .andExpect(status().isOk());

        // User changes password on TU side
        currentTuPassword.set("newPass456");
        // Simulate 5-minute auth cache TTL expiration before verifying immediate rejection
        tuAuthCacheService.clear();

        // Old password must fail with 401
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", tuUser, "password", "oldPass123"))))
                .andExpect(status().isUnauthorized());

        // New password must succeed with 200
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", tuUser, "password", "newPass456"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("US-09.1 Case 4: Inactive student or resigned employee returns 403 Forbidden")
    void inactiveTuAccountsReturn403Forbidden() throws Exception {
        handlerRef.set((u, p) -> new MockTuResponse(200, """
                {
                  "status": true,
                  "message": "Success",
                  "type": "student",
                  "username": "5701010101",
                  "tu_status": "สำเร็จการศึกษา",
                  "displayname_th": "ศิษย์เก่า ทดสอบ",
                  "faculty": "วิทยาลัยนวัตกรรม",
                  "department": "สาขาวิชาการบริหารเทคโนโลยี"
                }
                """));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "5701010101", "password", "pw"))))
                .andExpect(status().isForbidden());

        handlerRef.set((u, p) -> new MockTuResponse(200, """
                {
                  "status": true,
                  "message": "Success",
                  "type": "employee",
                  "username": "resignedstaff",
                  "StatusWork": "0",
                  "StatusEmp": "ลาออก",
                  "displayname_th": "อดีต บุคลากร",
                  "organization": "สำนักงานศูนย์เทคโนโลยีสารสนเทศและการสื่อสาร"
                }
                """));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "resignedstaff", "password", "pw"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("US-09.1 Quota Protection: invalid username/password format returns 400 without calling TU API")
    void invalidUsernameFormatRejectedWith400WithoutCallingTuApi() throws Exception {
        handlerRef.set((u, p) -> new MockTuResponse(200, "{}"));

        for (String badUsername : new String[]{"ab", "bad user", "user@invalid!"}) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("username", badUsername, "password", "pass123"))))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", "6809990002", "password", "x".repeat(129)))))
                .andExpect(status().isBadRequest());

        assertThat(tuApiCallCount.get()).isZero();
    }

    @Test
    @DisplayName("US-09.1 Quota Protection: short-TTL cache avoids repeat TU API call for identical credentials")
    void shortTtlCachePreventsDuplicateTuApiCallsForSameCredentials() throws Exception {
        String tuUser = "6809990003";
        refreshTokenRepository.deleteAll();
        userRepository.findById(tuUser).ifPresent(userRepository::delete);

        handlerRef.set((u, p) -> new MockTuResponse(200, """
                {
                  "status": true,
                  "message": "Success",
                  "type": "student",
                  "username": "6809990003",
                  "tu_status": "ปกติ",
                  "displayname_th": "นักศึกษา แคช",
                  "displayname_en": "Cached Student",
                  "email": "cached.std@dome.tu.ac.th",
                  "department": "วิทยาการคอมพิวเตอร์",
                  "faculty": "วิทยาศาสตร์และเทคโนโลยี"
                }
                """));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", tuUser, "password", "cachePass1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.studentId").value(tuUser));

        assertThat(tuApiCallCount.get()).isEqualTo(1);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", tuUser, "password", "cachePass1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.studentId").value(tuUser));

        assertThat(tuApiCallCount.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("US-09.1 Quota Protection: IP rate limiter blocks 6th attempt within window with 429")
    void ipRateLimiterBlocksSixthFailedAttemptWithinWindowWith429() throws Exception {
        handlerRef.set((u, p) -> new MockTuResponse(400, """
                {
                  "status": false,
                  "message": "User or Password Invalid!"
                }
                """));

        int previousMaxAttempts = loginRateLimiter.getMaxAttempts();
        loginRateLimiter.setMaxAttempts(5);
        try {
            String clientIp = "203.0.113.10";
            for (int i = 1; i <= 5; i++) {
                mockMvc.perform(post("/api/auth/login")
                                .header("X-Real-IP", clientIp)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(Map.of("username", "6809990004", "password", "wrong" + i))))
                        .andExpect(status().isUnauthorized());
            }

            assertThat(tuApiCallCount.get()).isEqualTo(5);

            // 6th attempt from the same IP must be rejected with 429 before calling TU API
            mockMvc.perform(post("/api/auth/login")
                            .header("X-Real-IP", clientIp)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("username", "6809990004", "password", "wrong6"))))
                    .andExpect(status().isTooManyRequests());

            assertThat(tuApiCallCount.get()).isEqualTo(5);

            // A different client IP is still allowed to attempt login
            mockMvc.perform(post("/api/auth/login")
                            .header("X-Real-IP", "203.0.113.11")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("username", "6809990004", "password", "wrong1"))))
                    .andExpect(status().isUnauthorized());

            assertThat(tuApiCallCount.get()).isEqualTo(6);
        } finally {
            loginRateLimiter.setMaxAttempts(previousMaxAttempts);
            loginRateLimiter.reset();
        }
    }
}
