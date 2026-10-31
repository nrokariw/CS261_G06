package com.example.demo.constant;

public enum TransactionStatus {
    ACTIVE,
    COMPLETED,
    DISPUTED;

    //แปลงสถานะของธุรกรรมในปัจจุบัน ให้เป็นสถานะของสิ่งของที่สอดคล้องกัน
    public ItemStatus getItemStatus() {
        switch (this) {
            case ACTIVE: // เมื่อทำรายการยืม ต้องเปลี่ยนสถานะของไอเท็มเป็น BORROWED
                return ItemStatus.BORROWED; 
            case COMPLETED: // เมื่อทำรายการคืนและจบกระบวนการ ต้องเปลี่ยนสถานะของไอเท็มเป็น AVAILABLE
                return ItemStatus.AVAILABLE; 
            default:
                return null;
        }
    }

    //แปลงสถานะของธุรกรรมในปัจจุบัน ให้เป็นสถานะของประเภทหลักฐานที่สอดคล้องกัน
    public ProofType getProofType() {
        switch (this) {
            case ACTIVE: // เมื่อทำรายการยืม ต้องมีหลักฐานการยืม HANDOVER
                return ProofType.HANDOVER; 
            case COMPLETED: // เมื่อทำรายการคืนและจบกระบวนการ ต้องมีหลักฐานการคืน RETURN
                return ProofType.RETURN; 
            default:
                return null;
        }
    }
}
