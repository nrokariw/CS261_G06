:setvar DB_NAME our_project_db

-- สร้างฐานข้อมูลตามตัวแปรสภาพแวดล้อม DB_NAME (หากยังไม่มี)
IF DB_ID(N'$(DB_NAME)') IS NULL
BEGIN
    CREATE DATABASE [$(DB_NAME)];
END
GO

-- เลือกใช้งานฐานข้อมูลตามตัวแปรสภาพแวดล้อม DB_NAME
USE [$(DB_NAME)];
GO

-- สร้างตาราง users สำหรับเก็บข้อมูลบัญชีผู้ใช้และรหัสผ่าน BCrypt (US-AUTH.1)
IF OBJECT_ID('users', 'U') IS NULL
BEGIN
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
END
GO

-- สร้างตาราง refresh_tokens สำหรับทำ Refresh Token Rotation (US-AUTH.1)
IF OBJECT_ID('refresh_tokens', 'U') IS NULL
BEGIN
    CREATE TABLE refresh_tokens (
        id VARCHAR(36) PRIMARY KEY,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        student_id VARCHAR(50) NOT NULL,
        expires_at DATETIME2 NOT NULL,
        revoked BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
END
GO

-- สร้างตาราง items ตามโครงสร้างที่กำหนด
IF OBJECT_ID('items', 'U') IS NULL
BEGIN
    CREATE TABLE items (
        item_id VARCHAR(36) PRIMARY KEY, -- ใช้ VARCHAR เก็บ UUID
        owner_id VARCHAR(50) NOT NULL, -- อ้างอิงถึง user หรือ studentId/employeeId
        title NVARCHAR(255) NOT NULL,
        category NVARCHAR(100) NOT NULL,
        description NVARCHAR(MAX),
        image_url VARCHAR(500),
        status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, BORROWED
        available_from DATETIME2 NULL,
        available_until DATETIME2 NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL
    );
END
GO

-- สร้างตาราง borrow_requests ตามโครงสร้างที่กำหนด พร้อมผูก Foreign Key
IF OBJECT_ID('borrow_requests', 'U') IS NULL
BEGIN
    CREATE TABLE borrow_requests (
        request_id VARCHAR(36) PRIMARY KEY, -- ใช้ VARCHAR เก็บ UUID
        item_id VARCHAR(36) NOT NULL,
        borrower_id VARCHAR(50) NOT NULL,
        start_date DATETIME2 NOT NULL,
        end_date DATETIME2 NOT NULL,
        reason NVARCHAR(MAX),
        response_reason NVARCHAR(MAX),
        request_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, CANCELLED, CHANGE_REQUESTED
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_borrow_requests_items FOREIGN KEY (item_id) REFERENCES items(item_id)
    );
END
GO

-- สร้างตาราง borrowing_transaction สำหรับเก็บประวัติการยืม-คืนสิ่งของ
IF OBJECT_ID('borrowing_transaction', 'U') IS NULL
BEGIN
    CREATE TABLE borrowing_transaction (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        request_id VARCHAR(255),
        borrower_id VARCHAR(255),
        lender_id VARCHAR(255),
        item_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        borrowed_at DATETIME2,
        returned_at DATETIME2
    );
END
GO

-- สร้างตาราง evidence_proof สำหรับเก็บหลักฐานการรับ-คืนสิ่งของ
IF OBJECT_ID('evidence_proof', 'U') IS NULL
BEGIN
    CREATE TABLE evidence_proof (
        id VARCHAR(255) NOT NULL PRIMARY KEY,
        transaction_id VARCHAR(255),
        uploader_id VARCHAR(255),
        proof_type VARCHAR(50),
        image_url VARCHAR(255),
        note NVARCHAR(MAX),
        captured_at DATETIME2
    );
END
GO
