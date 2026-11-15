package com.example.demo.dto;

import org.springframework.web.multipart.MultipartFile;

public class HandoverRequestDto {
    private MultipartFile imageFile;
    private String note;
    private String conditionNote;

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

    public String getConditionNote() {
        return conditionNote;
    }

    public void setConditionNote(String conditionNote) {
        this.conditionNote = conditionNote;
    }

    /**
     * คืนค่าหมายเหตุโดยรองรับทั้ง field name "note" (ตาม Spec) และ "conditionNote"
     */
    public String getEffectiveNote() {
        if (note != null && !note.isBlank()) {
            return note;
        }
        return conditionNote;
    }
}