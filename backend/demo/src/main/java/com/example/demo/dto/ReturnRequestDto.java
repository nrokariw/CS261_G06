package com.example.demo.dto;

import org.springframework.web.multipart.MultipartFile;

public class ReturnRequestDto {
    private MultipartFile imageFile;
    private String note;

    // Getters and Setters
    public MultipartFile getImageFile() {
        return imageFile;
    }

    public void setImageFile(MultipartFile imageFile) {
        this.imageFile = imageFile;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}