package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ExternalApiProperties {

    @Value("${app.env:demo}")
    private String appEnv;

    @Value("${app.external-services.tu-api-base-url:https://api.tu.ac.th/v1}")
    private String tuApiBaseUrl;

    @Value("${app.external-services.tu-api-verify-path:/auth/Ad/verify}")
    private String tuApiVerifyPath;

    @Value("${app.external-services.tu-api-token:}")
    private String tuApiToken;

    @Value("${app.auth.mode:AUTO}")
    private String authMode;

    public String getAppEnv() {
        if (appEnv == null || appEnv.isBlank()) {
            return "demo";
        }
        return appEnv.trim().toLowerCase();
    }

    public void setAppEnv(String appEnv) {
        this.appEnv = appEnv;
    }

    public boolean isProdMode() {
        String env = getAppEnv();
        return "prod".equals(env) || "production".equals(env);
    }

    public boolean isDemoOrDevMode() {
        return !isProdMode();
    }

    public String getTuApiBaseUrl() {
        return tuApiBaseUrl;
    }

    public void setTuApiBaseUrl(String tuApiBaseUrl) {
        this.tuApiBaseUrl = tuApiBaseUrl;
    }

    public String getTuApiVerifyPath() {
        return tuApiVerifyPath;
    }

    public void setTuApiVerifyPath(String tuApiVerifyPath) {
        this.tuApiVerifyPath = tuApiVerifyPath;
    }

    public String getTuApiToken() {
        return tuApiToken;
    }

    public void setTuApiToken(String tuApiToken) {
        this.tuApiToken = tuApiToken;
    }

    public String getAuthMode() {
        if (authMode == null || authMode.isBlank() || "AUTO".equalsIgnoreCase(authMode.trim())) {
            return isProdMode() ? "TU_ONLY" : "HYBRID";
        }
        return authMode.trim().toUpperCase();
    }

    public void setAuthMode(String authMode) {
        this.authMode = authMode;
    }
}
