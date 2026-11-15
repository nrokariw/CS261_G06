package com.example.demo.service;

import com.example.demo.config.ExternalApiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@Service
public class TuAuthClient {

    private static final Logger log = LoggerFactory.getLogger(TuAuthClient.class);

    public record TuUserProfile(
            String userName,
            String type,
            String statusName,
            String prefixName,
            String displayNameTh,
            String displayNameEn,
            String email,
            String faculty,
            String department
    ) {}

    private final ExternalApiProperties externalApiProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public TuAuthClient(ExternalApiProperties externalApiProperties, ObjectMapper objectMapper) {
        this.externalApiProperties = externalApiProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public Optional<TuUserProfile> verifyWithTuApi(String username, String password) {
        String baseUrl = externalApiProperties.getTuApiBaseUrl();
        String verifyPath = externalApiProperties.getTuApiVerifyPath();
        String apiToken = externalApiProperties.getTuApiToken();

        if (baseUrl == null || baseUrl.isBlank() || apiToken == null || apiToken.isBlank()) {
            log.debug("[TuAuthClient] TU API URL or token is not configured; skipping external verification.");
            return Optional.empty();
        }

        String endpoint = buildVerifyUrl(baseUrl.trim(), verifyPath != null ? verifyPath.trim() : "/auth/Ad/verify");
        try {
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "UserName", username,
                    "PassWord", password
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .header("Application-Key", apiToken.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("[TuAuthClient] TU API responded with status {} for user {}", response.statusCode(), username);
                return Optional.empty();
            }

            return parseVerifyResponse(response.body(), username);
        } catch (Exception ex) {
            log.warn("[TuAuthClient] Could not verify credentials against TU API ({}): {}", endpoint, ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<TuUserProfile> parseVerifyResponse(String responseBody, String fallbackUsername) {
        if (responseBody == null || responseBody.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            boolean status = root.path("status").asBoolean(false);
            if (!status) {
                return Optional.empty();
            }

            JsonNode dataNode = root.has("data") && root.get("data").isObject()
                    ? root.get("data")
                    : root;

            String userName = firstNonBlank(
                    textOrNull(dataNode, "userName"),
                    textOrNull(dataNode, "username"),
                    textOrNull(root, "userName"),
                    textOrNull(root, "username"),
                    fallbackUsername
            );
            String type = firstNonBlank(
                    textOrNull(dataNode, "type"),
                    textOrNull(root, "type"),
                    "student"
            );
            String statusName = firstNonBlank(
                    textOrNull(dataNode, "statusname"),
                    textOrNull(dataNode, "tu_status"),
                    textOrNull(root, "statusname")
            );
            String prefixName = firstNonBlank(
                    textOrNull(dataNode, "prefixname"),
                    textOrNull(root, "prefixname")
            );
            String displayNameTh = firstNonBlank(
                    textOrNull(dataNode, "displayname_th"),
                    textOrNull(root, "displayname_th")
            );
            String displayNameEn = firstNonBlank(
                    textOrNull(dataNode, "displayname_en"),
                    textOrNull(root, "displayname_en")
            );
            String email = firstNonBlank(
                    textOrNull(dataNode, "email"),
                    textOrNull(root, "email"),
                    ""
            );
            String faculty = firstNonBlank(
                    textOrNull(dataNode, "faculty"),
                    textOrNull(root, "faculty"),
                    ""
            );
            String department = firstNonBlank(
                    textOrNull(dataNode, "department"),
                    textOrNull(root, "department"),
                    ""
            );

            return Optional.of(new TuUserProfile(
                    userName,
                    type,
                    statusName,
                    prefixName,
                    displayNameTh,
                    displayNameEn,
                    email,
                    faculty,
                    department
            ));
        } catch (Exception ex) {
            log.warn("[TuAuthClient] Failed to parse TU API JSON response: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String buildVerifyUrl(String baseUrl, String verifyPath) {
        if (verifyPath.startsWith("http://") || verifyPath.startsWith("https://")) {
            return verifyPath;
        }
        if (baseUrl.endsWith("/auth/Ad/verify")) {
            return baseUrl;
        }
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = verifyPath.startsWith("/") ? verifyPath : "/" + verifyPath;
        return normalizedBase + normalizedPath;
    }

    private String textOrNull(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) {
            return null;
        }
        String val = node.get(field).asText();
        return (val != null && !val.isBlank()) ? val.trim().replaceAll("\\s+", " ") : null;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return "";
    }
}
