-- สร้างฐานข้อมูล (ถ้ายังไม่มี)
CREATE DATABASE db_item_table
GO

-- เลือกใช้งานฐานข้อมูล
USE db_item_table;
GO

-- สร้างตาราง items ตามโครงสร้างที่กำหนด
CREATE TABLE items (
    item_id VARCHAR(36) PRIMARY KEY, -- ใช้ VARCHAR เก็บ UUID
    owner_id VARCHAR(50) NOT NULL, -- อ้างอิงถึง user หรือ studentId/employeeId
    title NVARCHAR(255) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    image_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- Available, Reserved, Borrowed
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);