package com.example.demo.dto;

import java.time.LocalDateTime;

public class WantedPostDto {
    private String title;
    private String category;
    private String description;
    private LocalDateTime neededFrom;
    private LocalDateTime neededUntil;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getNeededFrom() { return neededFrom; }
    public void setNeededFrom(LocalDateTime neededFrom) { this.neededFrom = neededFrom; }

    public LocalDateTime getNeededUntil() { return neededUntil; }
    public void setNeededUntil(LocalDateTime neededUntil) { this.neededUntil = neededUntil; }
}
