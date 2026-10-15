package com.example.demo.constant;

public enum TransactionStatus {
    ACTIVE,
    COMPLETED,
    DISPUTED;

    public ItemStatus getItemStatus() {
        switch (this) {
            case ACTIVE:
                return ItemStatus.BORROWED; // เมื่อทำรายการยืม ต้องเปลี่ยนสถานะของไอเท็มเป็น BORROWED
            case COMPLETED:
                return ItemStatus.AVAILABLE; // เมื่อทำรายการคืนและจบกระบวนการ ต้องเปลี่ยนสถานะของไอเท็มเป็น AVAILABLE
            default:
                return null;
        }
    }

    public ProofType getProofType() {
        switch (this) {
            case ACTIVE:
                return ProofType.HANDOVER; // เมื่อทำรายการยืม ต้องมีหลักฐานการยืม
            case COMPLETED:
                return ProofType.RETURN; // เมื่อทำรายการคืนและจบกระบวนการ ต้องมีหลักฐานการคืน
            default:
                return null;
        }
    }
}
