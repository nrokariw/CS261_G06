-- สร้างฐานข้อมูล
CREATE DATABASE our_project_db;
GO

-- เลือกใช้งานฐานข้อมูล
USE our_project_db;
GO

-- สร้างตาราง users สำหรับเก็บข้อมูลบัญชีผู้ใช้และรหัสผ่าน BCrypt (US-AUTH.1)
CREATE TABLE users (
    student_id VARCHAR(50) PRIMARY KEY,
    username NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(255),
    email NVARCHAR(255),
    faculty NVARCHAR(255),
    department NVARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'LOCAL'
);
GO

-- สร้างตาราง refresh_tokens สำหรับทำ Refresh Token Rotation (US-AUTH.1)
CREATE TABLE refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    student_id VARCHAR(50) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    revoked BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
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
