-- ============================================================================
-- Sprint 2 Migration: borrowing_transaction & evidence_proof (US-06, US-07, US-08)
-- ============================================================================

IF OBJECT_ID('borrowing_transaction', 'U') IS NULL
BEGIN
    CREATE TABLE borrowing_transaction (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        request_id VARCHAR(36) NOT NULL,
        borrower_id VARCHAR(50) NOT NULL,
        lender_id VARCHAR(50) NOT NULL,
        item_id VARCHAR(36) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE (Borrowed), COMPLETED (Returned), DISPUTED
        borrowed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        returned_at DATETIME2 NULL
    );
END;
GO

IF OBJECT_ID('evidence_proof', 'U') IS NULL
BEGIN
    CREATE TABLE evidence_proof (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        transaction_id VARCHAR(36) NOT NULL,
        uploader_id VARCHAR(50) NOT NULL,
        proof_type VARCHAR(50) NOT NULL, -- HANDOVER, RETURN
        image_url VARCHAR(500) NOT NULL,
        note NVARCHAR(MAX) NULL,
        captured_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_evidence_proof_transaction FOREIGN KEY (transaction_id) REFERENCES borrowing_transaction(id)
    );
END;
GO
