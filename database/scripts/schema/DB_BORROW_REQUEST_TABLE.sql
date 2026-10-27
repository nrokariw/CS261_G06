-- สร้างฐานข้อมูล (ถ้ายังไม่มี)
CREATE DATABASE db_borrow_request_table
GO

-- เลือกใช้งานฐานข้อมูล
USE db_borrow_request_table;
GO

-- สร้างตาราง borrow_requests ตามโครงสร้างที่กำหนด
CREATE TABLE borrow_requests (
    request_id VARCHAR(36) PRIMARY KEY, -- ใช้ VARCHAR เก็บ UUID
    item_id VARCHAR(36) NOT NULL, 
    borrower_id VARCHAR(50) NOT NULL,
    start_date DATETIME2 NOT NULL,
    end_date DATETIME2 NOT NULL,
    reason NVARCHAR(MAX),
    request_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, CANCELLED
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_borrow_requests_items FOREIGN KEY (item_id) REFERENCES items(item_id)
);