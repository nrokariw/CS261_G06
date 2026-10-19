package com.example.demo.dto;

import org.springframework.web.multipart.MultipartFile;

public class ItemCreateDto {

    private String title;
    private String category;
    private String description;
    private MultipartFile imageFile;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public MultipartFile getImageFile() { return imageFile; }
    public void setImageFile(MultipartFile imageFile) { this.imageFile = imageFile; }

}
