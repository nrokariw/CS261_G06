package com.example.demo.dto;

import java.time.LocalDateTime;

public class BorrowRequestDto {

    private String itemId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String reason;


    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
