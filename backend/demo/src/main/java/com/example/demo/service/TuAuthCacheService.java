package com.example.demo.service;

import com.example.demo.service.TuAuthClient.TuUserProfile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TuAuthCacheService {

    private record CacheEntry(TuUserProfile profile, Instant expiresAt) {}

    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final byte[] hmacSecret;
    private final Duration ttl;
    private final int maxEntries;

    public TuAuthCacheService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.auth.tu-cache.ttl-seconds:300}") long ttlSeconds,
            @Value("${app.auth.tu-cache.max-entries:5000}") int maxEntries) {
        this.hmacSecret = secret.getBytes(StandardCharsets.UTF_8);
        this.ttl = Duration.ofSeconds(Math.max(1, ttlSeconds));
        this.maxEntries = Math.max(100, maxEntries);
    }

    public Optional<TuUserProfile> get(String username, String password) {
        String key = computeKey(username, password);
        CacheEntry entry = cache.get(key);
        if (entry == null) {
            return Optional.empty();
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            cache.remove(key, entry);
            return Optional.empty();
        }
        return Optional.of(entry.profile());
    }

    public void put(String username, String password, TuUserProfile profile) {
        if (profile == null) {
            return;
        }
        if (cache.size() >= maxEntries) {
            evictExpired();
            if (cache.size() >= maxEntries) {
                cache.clear();
            }
        }
        String key = computeKey(username, password);
        cache.put(key, new CacheEntry(profile, Instant.now().plus(ttl)));
    }

    public void clear() {
        cache.clear();
    }

    private void evictExpired() {
        Instant now = Instant.now();
        cache.forEach((k, v) -> {
            if (now.isAfter(v.expiresAt())) {
                cache.remove(k, v);
            }
        });
    }

    private String computeKey(String username, String password) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacSecret, "HmacSHA256"));
            String input = (username != null ? username.trim() : "") + "\0" + (password != null ? password : "");
            byte[] digest = mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute HMAC cache key", ex);
        }
    }
}
