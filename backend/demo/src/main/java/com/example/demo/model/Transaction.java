package com.example.demo.model;

import com.example.demo.constant.TransactionStatus;
import org.joda.time.DateTime;

public class Transaction {
    
    //define attributes
    private String id;
    private String requestId;
    private String borrowerId;
    private String lenderId;
    private String itemId;
    private TransactionStatus status;
    private DateTime borrowedAt;
    private DateTime returnedAt;

    // define constructors
    public Transaction() { }
    public Transaction(String id, String requestId, String borrowerId, String lenderId, String itemId, TransactionStatus status, DateTime borrowedAt, DateTime returnedAt) {
        this.id = id;
        this.requestId = requestId;
        this.borrowerId = borrowerId;
        this.lenderId = lenderId;
        this.itemId = itemId;
        this.status = status;
        this.borrowedAt = borrowedAt;
        this.returnedAt = returnedAt;
    }

    //define getters and setters
    public String getId() { return id; }
    public String getRequestId() { return requestId; }
    public String getBorrowerId() { return borrowerId; }
    public String getLenderId() { return lenderId; }
    public String getItemId() { return itemId; }
    public TransactionStatus getStatus() { return status; }
    public DateTime getBorrowedAt() { return borrowedAt; }
    public DateTime getReturnedAt() { return returnedAt; }
    public void setId(String id) { this.id = id; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public void setBorrowerId(String borrowerId) { this.borrowerId = borrowerId; }
    public void setLenderId(String lenderId) { this.lenderId = lenderId; }
    public void setItemId(String itemId) { this.itemId = itemId; }
    public void setStatus(TransactionStatus status) { this.status = status; }
    public void setBorrowedAt(DateTime borrowedAt) { this.borrowedAt = borrowedAt; }
    public void setReturnedAt(DateTime returnedAt) { this.returnedAt = returnedAt; }

    //define methods
    /// public void completeTransaction() {
    ///     this.status = TransactionStatus.COMPLETED;
    ///     this.returnedAt = DateTime.now();
    /// }
    /// public void addProof(EvidenceProof proof) { }


}
