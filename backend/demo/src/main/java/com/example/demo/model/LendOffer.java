package com.example.demo.model;

import com.example.demo.constant.LendOfferStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "lend_offers")
public class LendOffer {

    @Id
    @Column(name = "id", length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "wanted_post_id", length = 36, nullable = false)
    private String wantedPostId;

    @Column(name = "lender_id", length = 50, nullable = false)
    private String lenderId;

    @Column(name = "offered_item_id", length = 36)
    private String offeredItemId;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private LendOfferStatus status = LendOfferStatus.PENDING;

    @Column(name = "created_at", updatable = false, columnDefinition = "DATETIME2")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "DATETIME2")
    private LocalDateTime updatedAt;

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
            this.status = LendOfferStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWantedPostId() { return wantedPostId; }
    public void setWantedPostId(String wantedPostId) { this.wantedPostId = wantedPostId; }

    public String getLenderId() { return lenderId; }
    public void setLenderId(String lenderId) { this.lenderId = lenderId; }

    public String getOfferedItemId() { return offeredItemId; }
    public void setOfferedItemId(String offeredItemId) { this.offeredItemId = offeredItemId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LendOfferStatus getStatus() { return status; }
    public void setStatus(LendOfferStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
