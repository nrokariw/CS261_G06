package com.example.demo.constant;

public enum RequestStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    CANCELLED,
    CHANGE_REQUESTED;

    public ItemStatus getItemStatus() {
        switch (this) {
            case ACCEPTED:
                return ItemStatus.RESERVED;
            case REJECTED:
            case CHANGE_REQUESTED:
                return ItemStatus.AVAILABLE;
            case CANCELLED:
                return ItemStatus.UNAVAILABLE;
            default:
                return null;
        }
    } 

    // เพิ่มเมธอดแปลงจาก Request ที่ ACCEPTED กลายเป็น TransactionStatus เริ่มต้น
    public TransactionStatus getInitialTransactionStatus() {
        if (this == ACCEPTED) {
            return TransactionStatus.ACTIVE;
            }
        return null;
        }
}
