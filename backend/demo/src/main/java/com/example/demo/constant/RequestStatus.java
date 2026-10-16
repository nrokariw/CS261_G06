package com.example.demo.constant;

public enum RequestStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    CANCELLED;

    public ItemStatus getItemStatus() {
        switch (this) {
            case ACCEPTED:
                return ItemStatus.RESERVED;
            case REJECTED:
                return ItemStatus.AVAILABLE;
            case CANCELLED:
                return ItemStatus.UNAVAILABLE;
            default:
                return null;
        }
    } 
}
