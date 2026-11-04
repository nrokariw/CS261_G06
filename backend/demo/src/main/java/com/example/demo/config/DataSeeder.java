package com.example.demo.config;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@Order(2)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    public record DemoAccountSeed(
            String studentId,
            String username,
            String fullName,
            String email,
            String faculty,
            String department,
            String role,
            String roleLabelTh,
            String roleLabelEn
    ) {}

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ExternalApiProperties externalApiProperties;
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final String defaultPassword;
    private final String demoAccountsPath;

    private volatile List<DemoAccountSeed> cachedSeeds = Collections.emptyList();

    public DataSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ExternalApiProperties externalApiProperties,
            ObjectMapper objectMapper,
            ResourceLoader resourceLoader,
            @Value("${app.auth.demo-password:password123}") String defaultPassword,
            @Value("${app.seed.demo-accounts-path:classpath:seeds/demo-accounts.json}") String demoAccountsPath) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.externalApiProperties = externalApiProperties;
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
        this.defaultPassword = defaultPassword;
        this.demoAccountsPath = demoAccountsPath;
    }

    @Override
    public void run(String... args) {
        if (externalApiProperties.isProdMode()) {
            log.info("[DataSeeder] APP_ENV={} (production mode) — skipping demo student accounts seed.",
                    externalApiProperties.getAppEnv());
            return;
        }

        List<DemoAccountSeed> seeds = loadDemoAccountSeeds();
        for (DemoAccountSeed seed : seeds) {
            if (seed.studentId() == null || seed.studentId().isBlank()) {
                continue;
            }
            seedAccount(
                    seed.studentId().trim(),
                    seed.username() != null && !seed.username().isBlank() ? seed.username().trim() : seed.studentId().trim(),
                    seed.fullName() != null && !seed.fullName().isBlank() ? seed.fullName().trim() : seed.studentId().trim(),
                    seed.email() != null ? seed.email().trim() : "",
                    seed.faculty() != null ? seed.faculty().trim() : "",
                    seed.department() != null ? seed.department().trim() : "",
                    seed.role() != null && !seed.role().isBlank() ? seed.role().trim() : "STUDENT"
            );
        }
        log.info("[DataSeeder] APP_ENV={} — seeded {} demo student accounts from {}.",
                externalApiProperties.getAppEnv(), seeds.size(), demoAccountsPath);
    }

    public List<DemoAccountSeed> loadDemoAccountSeeds() {
        if (!cachedSeeds.isEmpty()) {
            return cachedSeeds;
        }
        try {
            Resource resource = resourceLoader.getResource(demoAccountsPath);
            if (!resource.exists()) {
                log.warn("[DataSeeder] Demo accounts seed file not found at {}", demoAccountsPath);
                return Collections.emptyList();
            }
            try (InputStream is = resource.getInputStream()) {
                List<DemoAccountSeed> parsed = objectMapper.readValue(is, new TypeReference<List<DemoAccountSeed>>() {});
                cachedSeeds = parsed != null ? List.copyOf(parsed) : Collections.emptyList();
                return cachedSeeds;
            }
        } catch (Exception e) {
            log.error("[DataSeeder] Failed to read demo accounts seed file {}: {}", demoAccountsPath, e.getMessage());
            return Collections.emptyList();
        }
    }

    public List<Map<String, String>> getPublicDemoAccounts() {
        if (externalApiProperties.isProdMode()) {
            return Collections.emptyList();
        }
        List<DemoAccountSeed> seeds = loadDemoAccountSeeds();
        List<Map<String, String>> result = new ArrayList<>(seeds.size());
        for (DemoAccountSeed seed : seeds) {
            if (seed.studentId() == null || seed.studentId().isBlank()) {
                continue;
            }
            String studentId = seed.studentId().trim();
            User dbUser = userRepository.findById(studentId).orElse(null);

            Map<String, String> item = new LinkedHashMap<>();
            item.put("studentId", studentId);
            item.put("username", dbUser != null && dbUser.getUsername() != null ? dbUser.getUsername() : studentId);
            item.put("password", defaultPassword);
            String fullName = dbUser != null && dbUser.getFullName() != null && !dbUser.getFullName().isBlank()
                    ? dbUser.getFullName()
                    : (seed.fullName() != null ? seed.fullName() : studentId);
            item.put("name", fullName);
            item.put("fullName", fullName);
            item.put("faculty", dbUser != null && dbUser.getFaculty() != null
                    ? dbUser.getFaculty()
                    : (seed.faculty() != null ? seed.faculty() : ""));
            item.put("department", dbUser != null && dbUser.getDepartment() != null
                    ? dbUser.getDepartment()
                    : (seed.department() != null ? seed.department() : ""));
            item.put("roleLabelTh", seed.roleLabelTh() != null ? seed.roleLabelTh() : "");
            item.put("roleLabelEn", seed.roleLabelEn() != null ? seed.roleLabelEn() : "");
            result.add(item);
        }
        return result;
    }

    private void seedAccount(
            String studentId,
            String username,
            String fullName,
            String email,
            String faculty,
            String department,
            String role) {
        User user = userRepository.findById(studentId).orElseGet(User::new);
        boolean updated = false;

        if (user.getStudentId() == null) {
            user.setStudentId(studentId);
            updated = true;
        }
        if (user.getUsername() == null || user.getUsername().isBlank()) {
            user.setUsername(username);
            updated = true;
        }
        if (user.getFullName() == null || user.getFullName().isBlank() || user.getFullName().equals(studentId)) {
            user.setFullName(fullName);
            updated = true;
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(email);
            updated = true;
        }
        if (user.getFaculty() == null || user.getFaculty().isBlank()) {
            user.setFaculty(faculty);
            updated = true;
        }
        if (user.getDepartment() == null || user.getDepartment().isBlank()) {
            user.setDepartment(department);
            updated = true;
        }
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(defaultPassword));
            updated = true;
        }
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole(role);
            updated = true;
        }
        if (user.getAuthProvider() == null || user.getAuthProvider().isBlank()) {
            user.setAuthProvider("LOCAL");
            updated = true;
        }

        if (updated) {
            userRepository.save(user);
        }
    }
}
