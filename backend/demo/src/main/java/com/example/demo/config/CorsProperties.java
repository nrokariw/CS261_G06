package com.example.demo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.Arrays;

@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {
    
    //define attributes
    private String allowedOrigins;

    //define getters and setters
    public String getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    // 1.เมธอดดึงค่าและตัดช่องว่าง (Trim)
    public String[] getProcessedOrigins() {
        if (allowedOrigins == null || allowedOrigins.isEmpty()) {
            return new String[0];
        }
        return Arrays.stream(allowedOrigins.split(","))
                .map(origin -> origin == null ? "" : origin.trim())
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);
    }

}