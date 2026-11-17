-- Migration: US-BRRQS (Wanted Posts & Lend Offers for Borrow Requests)
-- Idempotent MSSQL migration

IF OBJECT_ID('wanted_posts', 'U') IS NULL
BEGIN
    CREATE TABLE wanted_posts (
        id VARCHAR(36) PRIMARY KEY,
        requester_id VARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        category NVARCHAR(100) NOT NULL,
        description NVARCHAR(MAX) NULL,
        needed_from DATETIME2 NULL,
        needed_until DATETIME2 NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        deleted_at DATETIME2 NULL,
        CONSTRAINT FK_wanted_posts_requester FOREIGN KEY (requester_id) REFERENCES users(student_id)
    );
END
GO

IF OBJECT_ID('lend_offers', 'U') IS NULL
BEGIN
    CREATE TABLE lend_offers (
        id VARCHAR(36) PRIMARY KEY,
        wanted_post_id VARCHAR(36) NOT NULL,
        lender_id VARCHAR(50) NOT NULL,
        offered_item_id VARCHAR(36) NULL,
        message NVARCHAR(MAX) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_lend_offers_wanted_post FOREIGN KEY (wanted_post_id) REFERENCES wanted_posts(id),
        CONSTRAINT FK_lend_offers_lender FOREIGN KEY (lender_id) REFERENCES users(student_id)
    );
END
GO
