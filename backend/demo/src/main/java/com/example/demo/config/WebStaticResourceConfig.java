package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebStaticResourceConfig implements WebMvcConfigurer {

    //define attributes
    private final String productsUploadDir;
    private final String evidenceUploadDir;

    //define constructor
    public WebStaticResourceConfig(
            @Value("${file.upload-dir:uploads/products}") String productsUploadDir,
            @Value("${file.evidence-upload-dir:uploads/evidence}") String evidenceUploadDir) {
        this.productsUploadDir = productsUploadDir;
        this.evidenceUploadDir = evidenceUploadDir;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path productsPath = Paths.get(productsUploadDir).toAbsolutePath().normalize();
        Path evidencePath = Paths.get(evidenceUploadDir).toAbsolutePath().normalize();

        registry.addResourceHandler("/uploads/products/**")
                .addResourceLocations(productsPath.toUri().toString());

        registry.addResourceHandler("/uploads/evidence/**")
                .addResourceLocations(evidencePath.toUri().toString());
    }
}
