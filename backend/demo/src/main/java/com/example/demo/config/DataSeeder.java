package com.example.demo.config;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(2)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String defaultPassword;

    public DataSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.auth.demo-password:password123}") String defaultPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.defaultPassword = defaultPassword;
    }

    @Override
    public void run(String... args) {
        seedAccount(
                "6809000001",
                "6809000001",
                "Ploy S.",
                "ploy.s@dome.tu.ac.th",
                "คณะวิทยาศาสตร์และเทคโนโลยี",
                "สาขาวิชาวิทยาการคอมพิวเตอร์",
                "STUDENT"
        );
        seedAccount(
                "6809000002",
                "6809000002",
                "Boom N.",
                "boom.n@dome.tu.ac.th",
                "คณะวิทยาศาสตร์และเทคโนโลยี",
                "สาขาวิชาวิทยาการคอมพิวเตอร์",
                "STUDENT"
        );
        seedAccount(
                "6809000003",
                "6809000003",
                "Somchai K.",
                "somchai.k@dome.tu.ac.th",
                "คณะวิศวกรรมศาสตร์",
                "สาขาวิชาวิศวกรรมคอมพิวเตอร์",
                "STUDENT"
        );
        log.info("[DataSeeder] Demo student accounts verified/seeded (6809000001, 6809000002, 6809000003).");
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
