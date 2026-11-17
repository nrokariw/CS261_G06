package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginRateLimiter {

    private final ConcurrentHashMap<String, Deque<Instant>> attemptsByIp = new ConcurrentHashMap<>();
    private final int maxTrackedIps;
    private volatile int maxAttempts;
    private volatile Duration window;

    public LoginRateLimiter(
            @Value("${app.auth.rate-limit.max-attempts:5}") int maxAttempts,
            @Value("${app.auth.rate-limit.window-minutes:10}") int windowMinutes,
            @Value("${app.auth.rate-limit.max-tracked-ips:10000}") int maxTrackedIps) {
        this.maxAttempts = maxAttempts;
        this.window = Duration.ofMinutes(Math.max(1, windowMinutes));
        this.maxTrackedIps = Math.max(100, maxTrackedIps);
    }

    public void checkAllowed(String clientIp) {
        String key = normalizeIp(clientIp);
        Instant cutoff = Instant.now().minus(window);
        Deque<Instant> deque = attemptsByIp.get(key);
        if (deque == null) {
            return;
        }
        synchronized (deque) {
            pruneExpired(deque, cutoff);
            if (deque.size() >= maxAttempts) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too many login attempts. Please try again later."
                );
            }
        }
    }

    public void recordAttempt(String clientIp) {
        String key = normalizeIp(clientIp);
        if (attemptsByIp.size() >= maxTrackedIps && !attemptsByIp.containsKey(key)) {
            evictExpiredEntries();
            if (attemptsByIp.size() >= maxTrackedIps) {
                attemptsByIp.clear();
            }
        }
        Instant now = Instant.now();
        Instant cutoff = now.minus(window);
        Deque<Instant> deque = attemptsByIp.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (deque) {
            pruneExpired(deque, cutoff);
            deque.addLast(now);
        }
    }

    public void reset() {
        attemptsByIp.clear();
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    private void pruneExpired(Deque<Instant> deque, Instant cutoff) {
        while (!deque.isEmpty() && deque.peekFirst().isBefore(cutoff)) {
            deque.pollFirst();
        }
    }

    private void evictExpiredEntries() {
        Instant cutoff = Instant.now().minus(window);
        attemptsByIp.forEach((ip, deque) -> {
            synchronized (deque) {
                pruneExpired(deque, cutoff);
                if (deque.isEmpty()) {
                    attemptsByIp.remove(ip, deque);
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
}
