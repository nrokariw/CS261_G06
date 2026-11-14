package com.example.demo.dto;

import org.springframework.web.multipart.MultipartFile;

public class HandoverRequestDto {
    private MultipartFile imageFile;
    private String conditionNote;

    // Getters and Setters
    public MultipartFile getImageFile() {
        return imageFile;
    }

    public void setImageFile(MultipartFile imageFile) {
        this.imageFile = imageFile;
    }

    public String getConditionNote() {
        return conditionNote;
    }

    public void setConditionNote(String conditionNote) {
        this.conditionNote = conditionNote;
    }
}