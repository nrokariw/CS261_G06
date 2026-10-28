package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final CorsProperties corsProperties;
    private final String uploadDir;

    // Constructor for injecting CorsProperties
    public CorsConfig(
            CorsProperties corsProperties,
            @Value("${file.upload-dir:uploads/products}") String uploadDir) {
        this.corsProperties = corsProperties;
        this.uploadDir = uploadDir;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // ใช้กับทุก API Routes
                .allowedOrigins(corsProperties.getProcessedOrigins()) // เรียกใช้เมธอด trim ที่เตรียมไว้
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String productsLocation = Paths.get(uploadDir).toAbsolutePath().normalize().toUri().toString();
        if (!productsLocation.endsWith("/")) {
            productsLocation += "/";
        }
        registry.addResourceHandler("/uploads/products/**")
                .addResourceLocations(productsLocation);
    }
}
