package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ExternalApiProperties {

    //define attributes where injected from application.properties
    @Value("${app.external-services.tu-api-base-url}")
    private String tuApiBaseUrl;

    @Value("${app.external-services.tu-api-token}")
    private String tuApiToken;

    //define getter
    public String getTuApiBaseUrl() {
        return tuApiBaseUrl;
    }

    public String getTuApiToken() {
        return tuApiToken;
    }
}