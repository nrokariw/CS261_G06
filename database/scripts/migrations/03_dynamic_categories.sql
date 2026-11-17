-- Migration: Dynamic Database-Backed Categories
-- Idempotent MSSQL migration

IF OBJECT_ID('categories', 'U') IS NULL
BEGIN
    CREATE TABLE categories (
        code VARCHAR(50) PRIMARY KEY,
        name_th NVARCHAR(100) NOT NULL,
        name_en NVARCHAR(100) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1
    );
END
ELSE
BEGIN
    ALTER TABLE categories ALTER COLUMN name_th NVARCHAR(100) NOT NULL;
    ALTER TABLE categories ALTER COLUMN name_en NVARCHAR(100) NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM categories)
BEGIN
    INSERT INTO categories (code, name_th, name_en, sort_order, is_active) VALUES
        ('STUDY', N'อุปกรณ์การเรียน', N'Study Materials', 1, 1),
        ('ELECTRONICS', N'อุปกรณ์อิเล็กทรอนิกส์', N'Electronics', 2, 1),
        ('SPORTS', N'อุปกรณ์กีฬา', N'Sports Gear', 3, 1),
        ('GENERAL', N'ของใช้ทั่วไป', N'General Items', 4, 1);
END
GO
