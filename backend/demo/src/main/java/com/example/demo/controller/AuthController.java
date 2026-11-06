package com.example.demo.controller;

import com.example.demo.config.DataSeeder;
import com.example.demo.config.ExternalApiProperties;
import com.example.demo.model.User;
import com.example.demo.service.AuthService;
import com.example.demo.service.AuthService.AuthResult;
import com.example.demo.service.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("${app.api.auth-path:/api/auth}")
public class AuthController {

    public static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final AuthService authService;
    private final JwtService jwtService;
    private final DataSeeder dataSeeder;
    private final ExternalApiProperties externalApiProperties;

    public AuthController(
            AuthService authService,
            JwtService jwtService,
            DataSeeder dataSeeder,
            ExternalApiProperties externalApiProperties) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.dataSeeder = dataSeeder;
        this.externalApiProperties = externalApiProperties;
    }

    @GetMapping("/demo-accounts")
    public ResponseEntity<Map<String, Object>> getDemoAccounts() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("appEnv", externalApiProperties.getAppEnv());
        body.put("demoEnabled", externalApiProperties.isDemoOrDevMode());
        body.put("accounts", dataSeeder.getPublicDemoAccounts());
        return ResponseEntity.ok(body);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> payload,
            HttpServletResponse response) {
        String username = firstNonBlank(
                payload.get("username"),
                payload.get("studentId"),
                payload.get("UserName")
        );
        String password = firstNonBlank(
                payload.get("password"),
                payload.get("PassWord")
        );

        AuthResult result = authService.login(username, password);
        addRefreshTokenCookie(response, result.rawRefreshToken(), Duration.ofMillis(jwtService.getRefreshExpirationMs()));

        return ResponseEntity.ok(buildAuthResponse(result.accessToken(), result.user()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshTokenCookie,
            HttpServletResponse response) {
        AuthResult result = authService.refreshAccessToken(refreshTokenCookie);
        addRefreshTokenCookie(response, result.rawRefreshToken(), Duration.ofMillis(jwtService.getRefreshExpirationMs()));

        return ResponseEntity.ok(buildAuthResponse(result.accessToken(), result.user()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshTokenCookie,
            HttpServletResponse response) {
        authService.logout(refreshTokenCookie);
        addRefreshTokenCookie(response, "", Duration.ZERO);

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        User user = authService.getAuthenticatedUser(authentication.getName());
        Map<String, Object> userProfile = buildUserProfileMap(user);
        Map<String, Object> body = new LinkedHashMap<>(userProfile);
        body.put("user", userProfile);
        body.put("userProfile", userProfile);
        return ResponseEntity.ok(body);
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String tokenValue, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, tokenValue != null ? tokenValue : "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private Map<String, Object> buildAuthResponse(String accessToken, User user) {
        Map<String, Object> userProfile = buildUserProfileMap(user);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("accessToken", accessToken);
        response.put("token", accessToken);
        response.put("user", userProfile);
        response.put("userProfile", userProfile);
        return response;
    }

    private Map<String, Object> buildUserProfileMap(User user) {
        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getStudentId());
        profile.put("studentId", user.getStudentId());
        profile.put("username", user.getUsername() != null ? user.getUsername() : user.getStudentId());
        profile.put("name", user.getFullName() != null ? user.getFullName() : user.getStudentId());
        profile.put("fullName", user.getFullName() != null ? user.getFullName() : user.getStudentId());
        profile.put("email", user.getEmail() != null ? user.getEmail() : "");
        profile.put("faculty", user.getFaculty() != null ? user.getFaculty() : "");
        profile.put("department", user.getDepartment() != null ? user.getDepartment() : "");
        profile.put("role", user.getRole());
        profile.put("authProvider", user.getAuthProvider());
        return profile;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }
}
