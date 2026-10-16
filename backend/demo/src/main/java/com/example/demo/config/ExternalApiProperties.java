package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ExternalApiProperties {
    @Value("${app.external-services.tu-api-base-url}")
    private String tuApiBaseUrl;

    public String getTuApiBaseUrl() {
        return tuApiBaseUrl;
    }
}