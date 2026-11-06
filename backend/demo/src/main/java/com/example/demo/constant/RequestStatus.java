package com.example.demo.constant;

public enum RequestStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    CANCELLED,
    CHANGE_REQUESTED;

    // เมธอดแปลงสถานะคำขอปัจจุบัน ให้เป็นสถานะของสิ่งของที่สอดคล้องกัน
    public ItemStatus getItemStatus() {
        switch (this) {
            case ACCEPTED: // ถ้าคำขอยืมได้รับการอนุมัติ สิ่งของจะถูกจองไว้ (RESERVED)
                return ItemStatus.RESERVED;
            case REJECTED: // ถ้าคำขอยืมถูกปฏิเสธ สิ่งของจะกลับมาว่างพร้อมใช้งาน (AVAILABLE)
            case CHANGE_REQUESTED: // ถ้าเจ้าของขอให้แก้ไขข้อมูลคำขอยืม สิ่งของยังว่างพร้อมใช้งาน (AVAILABLE)
                return ItemStatus.AVAILABLE;
            case CANCELLED: // ถ้าคำขอยืมถูกยกเลิก สิ่งของจะถูกตั้งค่าเป็นไม่พร้อมใช้งาน (UNAVAILABLE) ป้องกันปัญหาจากการถูกยกเลิกซ้ำบ่อยจากผู้ยืม
                return ItemStatus.UNAVAILABLE;
            default:
                return null;
        }
    } 

    // เมธอดแปลงจาก Request ที่ ACCEPTED กลายเป็น TransactionStatus เริ่มต้น
    public TransactionStatus getInitialTransactionStatus() {
        if (this == ACCEPTED) {
            return TransactionStatus.ACTIVE;
            }
        return null;
        }
}
