package com.example.demo.service;

import com.example.demo.config.ExternalApiProperties;
import com.example.demo.model.RefreshToken;
import com.example.demo.model.User;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.TuAuthClient.TuUserProfile;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {

    public record AuthResult(
            String accessToken,
            String rawRefreshToken,
            User user
    ) {}

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final TuAuthClient tuAuthClient;
    private final ExternalApiProperties externalApiProperties;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            TuAuthClient tuAuthClient,
            ExternalApiProperties externalApiProperties) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.tuAuthClient = tuAuthClient;
        this.externalApiProperties = externalApiProperties;
    }

    @Transactional
    public AuthResult login(String usernameOrStudentId, String password) {
        if (usernameOrStudentId == null || usernameOrStudentId.isBlank()
                || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Username and password are required");
        }

        String identifier = usernameOrStudentId.trim();
        String mode = externalApiProperties.getAuthMode() != null
                ? externalApiProperties.getAuthMode().trim().toUpperCase()
                : "HYBRID";

        User authenticatedUser = null;

        // 1. Check Local Database (BCrypt) unless mode is strictly TU_ONLY
        if (!"TU_ONLY".equals(mode)) {
            Optional<User> localCandidate = userRepository.findById(identifier)
                    .or(() -> userRepository.findByUsername(identifier));

            if (localCandidate.isPresent()) {
                User localUser = localCandidate.get();
                if (localUser.getPasswordHash() != null
                        && !localUser.getPasswordHash().isBlank()
                        && passwordEncoder.matches(password, localUser.getPasswordHash())) {
                    authenticatedUser = localUser;
                }
            }
        }

        // 2. Fallback or verify via TU REST API if not authenticated locally and mode is HYBRID or TU_ONLY
        if (authenticatedUser == null && ("HYBRID".equals(mode) || "TU_ONLY".equals(mode) || "TU_API".equals(mode))) {
            Optional<TuUserProfile> tuProfile = tuAuthClient.verifyWithTuApi(identifier, password);
            if (tuProfile.isPresent()) {
                authenticatedUser = upsertTuUser(tuProfile.get(), password);
            }
        }

        if (authenticatedUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid student ID/username or password");
        }

        return issueTokensForUser(authenticatedUser);
    }

    @Transactional
    public User upsertTuUser(TuUserProfile profile, String rawPassword) {
        String studentId = profile.userName();
        User user = userRepository.findById(studentId)
                .or(() -> userRepository.findByUsername(studentId))
                .orElseGet(User::new);

        user.setStudentId(studentId);
        user.setUsername(studentId);

        String displayName = (profile.displayNameTh() != null && !profile.displayNameTh().isBlank())
                ? profile.displayNameTh()
                : ((profile.displayNameEn() != null && !profile.displayNameEn().isBlank())
                    ? profile.displayNameEn()
                    : studentId);
        user.setFullName(displayName);

        if (profile.email() != null && !profile.email().isBlank()) {
            user.setEmail(profile.email());
        }
        if (profile.faculty() != null && !profile.faculty().isBlank()) {
            user.setFaculty(profile.faculty());
        }
        if (profile.department() != null && !profile.department().isBlank()) {
            user.setDepartment(profile.department());
        }

        String resolvedRole = "employee".equalsIgnoreCase(profile.type()) ? "STAFF" : "STUDENT";
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole(resolvedRole);
        }
        user.setAuthProvider("TU_API");

        if (rawPassword != null && !rawPassword.isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(rawPassword));
        }

        return userRepository.save(user);
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public AuthResult refreshAccessToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing refresh token");
        }

        String tokenHash = jwtService.hashRefreshToken(rawRefreshToken);
        RefreshToken existingToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (existingToken.isRevoked()) {
            // Replay attack detected (TC-SEC-07): revoke all active refresh tokens for this user
            List<RefreshToken> activeTokens = refreshTokenRepository.findByStudentIdAndRevokedFalse(existingToken.getStudentId());
            for (RefreshToken token : activeTokens) {
                token.setRevoked(true);
            }
            refreshTokenRepository.saveAll(activeTokens);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token has already been used or revoked");
        }

        if (existingToken.isExpired()) {
            existingToken.setRevoked(true);
            refreshTokenRepository.save(existingToken);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token has expired");
        }

        // Rotate token: revoke old token and issue a new one
        existingToken.setRevoked(true);
        refreshTokenRepository.save(existingToken);

        User user = userRepository.findById(existingToken.getStudentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        return issueTokensForUser(user);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        String tokenHash = jwtService.hashRefreshToken(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    public User getAuthenticatedUser(String studentId) {
        if (studentId == null || studentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return userRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private AuthResult issueTokensForUser(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = jwtService.generateRawRefreshToken();
        String refreshTokenHash = jwtService.hashRefreshToken(rawRefreshToken);

        LocalDateTime expiresAt = LocalDateTime.now(ZoneOffset.UTC)
                .plus(Duration.ofMillis(jwtService.getRefreshExpirationMs()));

        RefreshToken refreshTokenEntity = new RefreshToken(
                refreshTokenHash,
                user.getStudentId(),
                expiresAt
        );
        refreshTokenRepository.save(refreshTokenEntity);

        return new AuthResult(accessToken, rawRefreshToken, user);
    }
}
