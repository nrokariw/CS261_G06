package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    //define attributes
    private final CorsProperties corsProperties;
    private final String uploadDir;
    private final String evidenceUploadDir;

    // Constructor for injecting CorsProperties
    public CorsConfig(
            CorsProperties corsProperties,
            @Value("${file.upload-dir:storage/products}") String uploadDir,
            @Value("${file.evidence-upload-dir:storage/evidence}") String evidenceUploadDir) {
        this.corsProperties = corsProperties;
        this.uploadDir = uploadDir;
        this.evidenceUploadDir = evidenceUploadDir;
    }

    /**
     * ตั้งค่า CORS (Cross-Origin Resource Sharing) เพื่ออนุญาตให้ฝั่ง Frontend
     * ที่รันอยู่คนละโดเมนหรือคนละพอร์ต สามารถยิง API มาใช้งาน Backend ได้
     */ 
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // ใช้กับทุก API Routes
                .allowedOrigins(corsProperties.getProcessedOrigins()) // เรียกใช้เมธอด trim ที่เตรียมไว้
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    /**
     * ตั้งค่า Resource Handler เพื่อเปลี่ยนโฟลเดอร์เก็บไฟล์ในเครื่อง (Physical Path) 
     * ให้กลายเป็น URL Path ที่คนภายนอกสามารถเรียกดูรูปภาพหรือไฟล์ผ่านเว็บเบราว์เซอร์ได้
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 1. Products Uploads
        String productsLocation = Paths.get(uploadDir).toAbsolutePath().normalize().toUri().toString();
        if (!productsLocation.endsWith("/")) {
            productsLocation += "/";
        }
        registry.addResourceHandler("/uploads/products/**")
                .addResourceLocations(productsLocation);

        // 2. Evidence Uploads
        String evidenceLocation = Paths.get(evidenceUploadDir).toAbsolutePath().normalize().toUri().toString();
        if (!evidenceLocation.endsWith("/")) {
            evidenceLocation += "/";
        }
        registry.addResourceHandler("/uploads/evidence/**")
                .addResourceLocations(evidenceLocation);
    }

}
