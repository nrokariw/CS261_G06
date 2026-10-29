-- สร้างฐานข้อมูล
CREATE DATABASE our_project_db;
GO

-- เลือกใช้งานฐานข้อมูล
USE our_project_db;
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
GO

-- สร้างตาราง borrow_requests ตามโครงสร้างที่กำหนด พร้อมผูก Foreign Key
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
GO
