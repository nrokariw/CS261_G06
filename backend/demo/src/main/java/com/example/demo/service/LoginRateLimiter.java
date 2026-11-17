package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginRateLimiter {

    private final ConcurrentHashMap<String, Deque<Instant>> attemptsByIp = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<Instant>> attemptsByUsername = new ConcurrentHashMap<>();
    private final int maxTrackedKeys;

    private volatile int maxIpAttempts;
    private volatile Duration ipWindow;
    private volatile int maxUsernameAttempts;
    private volatile Duration usernameWindow;

    public LoginRateLimiter(int maxIpAttempts, int ipWindowMinutes, int maxTrackedKeys) {
        this(maxIpAttempts, ipWindowMinutes, 5, 15, maxTrackedKeys);
    }

    @Autowired
    public LoginRateLimiter(
            @Value("${app.auth.rate-limit.max-attempts:20}") int maxIpAttempts,
            @Value("${app.auth.rate-limit.window-minutes:5}") int ipWindowMinutes,
            @Value("${app.auth.rate-limit.username-max-attempts:5}") int maxUsernameAttempts,
            @Value("${app.auth.rate-limit.username-window-minutes:15}") int usernameWindowMinutes,
            @Value("${app.auth.rate-limit.max-tracked-ips:10000}") int maxTrackedKeys) {
        this.maxIpAttempts = maxIpAttempts;
        this.ipWindow = Duration.ofMinutes(Math.max(1, ipWindowMinutes));
        this.maxUsernameAttempts = maxUsernameAttempts;
        this.usernameWindow = Duration.ofMinutes(Math.max(1, usernameWindowMinutes));
        this.maxTrackedKeys = Math.max(100, maxTrackedKeys);
    }

    public void checkAllowed(String clientIp) {
        checkBucket(attemptsByIp, normalizeIp(clientIp), maxIpAttempts, ipWindow, "There are too many traffic");
    }

    public void checkAllowed(String clientIp, String username) {
        checkBucket(attemptsByIp, normalizeIp(clientIp), maxIpAttempts, ipWindow, "There are too many traffic");
        String normalizedUser = normalizeUsername(username);
        if (normalizedUser != null) {
            checkBucket(
                    attemptsByUsername,
                    normalizedUser,
                    maxUsernameAttempts,
                    usernameWindow,
                    "Too many login attempts. Please try again later."
            );
        }
    }

    public void recordAttempt(String clientIp) {
        recordBucket(attemptsByIp, normalizeIp(clientIp), ipWindow);
    }

    public void recordAttempt(String clientIp, String username) {
        recordBucket(attemptsByIp, normalizeIp(clientIp), ipWindow);
        String normalizedUser = normalizeUsername(username);
        if (normalizedUser != null) {
            recordBucket(attemptsByUsername, normalizedUser, usernameWindow);
        }
    }

    public void reset() {
        attemptsByIp.clear();
        attemptsByUsername.clear();
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxIpAttempts = maxAttempts;
    }

    public int getMaxAttempts() {
        return maxIpAttempts;
    }

    public void setUsernameMaxAttempts(int maxUsernameAttempts) {
        this.maxUsernameAttempts = maxUsernameAttempts;
    }

    public int getUsernameMaxAttempts() {
        return maxUsernameAttempts;
    }

    private void checkBucket(
            ConcurrentHashMap<String, Deque<Instant>> bucket,
            String key,
            int maxAttempts,
            Duration window,
            String message) {
        Instant cutoff = Instant.now().minus(window);
        Deque<Instant> deque = bucket.get(key);
        if (deque == null) {
            return;
        }
        synchronized (deque) {
            pruneExpired(deque, cutoff);
            if (deque.size() >= maxAttempts) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, message);
            }
        }
    }

    private void recordBucket(
            ConcurrentHashMap<String, Deque<Instant>> bucket,
            String key,
            Duration window) {
        if (bucket.size() >= maxTrackedKeys && !bucket.containsKey(key)) {
            evictExpiredEntries(bucket, window);
            if (bucket.size() >= maxTrackedKeys) {
                bucket.clear();
            }
        }
        Instant now = Instant.now();
        Instant cutoff = now.minus(window);
        Deque<Instant> deque = bucket.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (deque) {
            pruneExpired(deque, cutoff);
            deque.addLast(now);
        }
    }

    private void pruneExpired(Deque<Instant> deque, Instant cutoff) {
        while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
            deque.pollFirst();
        }
    }

    private void evictExpiredEntries(ConcurrentHashMap<String, Deque<Instant>> bucket, Duration window) {
        Instant cutoff = Instant.now().minus(window);
        bucket.forEach((key, deque) -> {
            synchronized (deque) {
                pruneExpired(deque, cutoff);
                if (deque.isEmpty()) {
                    bucket.remove(key, deque);
                }
            }
        });
    }

    private String normalizeIp(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return "unknown";
        }
        return clientIp.trim();
    }

    private String normalizeUsername(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return username.trim().toLowerCase(Locale.ROOT);
    }
}
