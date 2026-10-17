package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.Arrays;

@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {
    
    private String allowedOrigins;

    public String getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    // เมธอดดึงค่าและตัดช่องว่าง (Trim)
    public String[] getProcessedOrigins() {
        if (allowedOrigins == null || allowedOrigins.isEmpty()) {
            return new String[0];
        }
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);
    }
}