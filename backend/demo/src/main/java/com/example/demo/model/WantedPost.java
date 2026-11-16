package com.example.demo.model;

import com.example.demo.constant.WantedPostStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "wanted_posts")
public class WantedPost {

    @Id
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "requester_id", length = 50, nullable = false)
    private String requesterId;

    @Column(nullable = false, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(nullable = false, columnDefinition = "NVARCHAR(100)")
    private String category;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "needed_from", columnDefinition = "DATETIME2")
    private LocalDateTime neededFrom;

    @Column(name = "needed_until", columnDefinition = "DATETIME2")
    private LocalDateTime neededUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WantedPostStatus status = WantedPostStatus.OPEN;

    @Column(name = "created_at", updatable = false, columnDefinition = "DATETIME2")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "DATETIME2")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at", columnDefinition = "DATETIME2")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        if (this.createdAt == null) {
            this.createdAt = nowUtc;
        }
        if (this.updatedAt == null) {
            this.updatedAt = nowUtc;
        }
        if (this.status == null) {
            this.status = WantedPostStatus.OPEN;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String requesterId) { this.requesterId = requesterId; }

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

    public WantedPostStatus getStatus() { return status; }
    public void setStatus(WantedPostStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
}
