package com.example.demo.model;

import com.example.demo.constant.RequestStatus;
import org.joda.time.DateTime;

public class BorrowRequest {
    
    //define attributes
    private String id;
    private String itemId;
    private String borrowerId;
    private DateTime startDate;
    private DateTime endDate;
    private RequestStatus status;
    private DateTime createdAt;

    //define constructors
    public BorrowRequest() { }
    public BorrowRequest(String id, String itemId, String borrowerId, DateTime startDate, DateTime endDate, RequestStatus status, DateTime createdAt) {
        this.id = id;
        this.itemId = itemId;
        this.borrowerId = borrowerId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.createdAt = createdAt;
    }

    //define getters and setters
    public String getId() { return id; }
    public String getItemId() { return itemId; }
    public String getBorrowerId() { return borrowerId; }
    public DateTime getStartDate() { return startDate; }
    public DateTime getEndDate() { return endDate; }
    public RequestStatus getStatus() { return status; }
    public DateTime getCreatedAt() { return createdAt; }
    public void setId(String id) { this.id = id; }
    public void setItemId(String itemId) { this.itemId = itemId; }
    public void setBorrowerId(String borrowerId) { this.borrowerId = borrowerId; }
    public void setStartDate(DateTime startDate) { this.startDate = startDate; }
    public void setEndDate(DateTime endDate) { this.endDate = endDate; }
    public void setStatus(RequestStatus status) { this.status = status; }
    public void setCreatedAt(DateTime createdAt) { this.createdAt = createdAt; }

    //define methods
    /// public void approve() {
    ///     this.status = RequestStatus.APPROVED;
    /// }
    /// public void reject() {
    ///     this.status = RequestStatus.REJECTED;
    /// }
}
