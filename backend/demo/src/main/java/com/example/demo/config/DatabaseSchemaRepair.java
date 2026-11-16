package com.example.demo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

@Component
@Order(1)
public class DatabaseSchemaRepair implements CommandLineRunner {

    //define attributes
    private static final Logger log = LoggerFactory.getLogger(DatabaseSchemaRepair.class);
    
    private final JdbcTemplate jdbcTemplate;

    //define constructor
    public DatabaseSchemaRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * ทำงานอัตโนมัติเมื่อแอปพลิเคชันเริ่มต้น (Startup) เพื่อตรวจสอบและซ่อมแซม Schema ของฐานข้อมูล 
     * แก้ไขปัญหาคอลัมน์วันที่ที่กลายเป็น varbinary และปรับปรุงคอลัมน์ข้อความให้รองรับภาษาไทย (NVARCHAR)
     */
    @Override
    public void run(String... args) {
        log.info("[DatabaseSchemaRepair] Starting database schema verification...");
        try {
            DataSource ds = jdbcTemplate.getDataSource();
            if (ds != null) {
                try (Connection conn = ds.getConnection()) {
                    String dbProduct = conn.getMetaData().getDatabaseProductName();
                    if (dbProduct != null && !dbProduct.toLowerCase().contains("microsoft")) {
                        log.info("[DatabaseSchemaRepair] Non-MSSQL database detected ({}), skipping MSSQL-specific DDL repair.", dbProduct);
                        return;
                    }
                }
            }
            // ตรวจสอบว่าตารางเก่ามีคอลัมน์วันที่ที่ถูกสร้างเป็น varbinary จาก Hibernate หรือไม่
            List<String> legacyTables = jdbcTemplate.queryForList(
                "SELECT DISTINCT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS " +
                "WHERE TABLE_NAME IN ('borrow_requests', 'borrowing_transaction', 'evidence_proof') " +
                "AND COLUMN_NAME IN ('start_date', 'end_date', 'created_at', 'borrowed_at', 'returned_at', 'captured_at') " +
                "AND DATA_TYPE = 'varbinary'",
                String.class
            );

            if (legacyTables.isEmpty()) {
                log.info("[DatabaseSchemaRepair] No legacy varbinary date columns detected.");
            } else {
                log.warn("[DatabaseSchemaRepair] Detected legacy varbinary date columns in tables: {}", legacyTables);
            }

            if (legacyTables.contains("borrow_requests") || legacyTables.contains("borrow_request")) {
                log.info("[DatabaseSchemaRepair] Recreating table 'borrow_requests' with DATETIME2 and NVARCHAR columns...");
                jdbcTemplate.execute(
                    "IF OBJECT_ID('borrowing_transaction', 'U') IS NOT NULL DROP TABLE borrowing_transaction; " +
                    "IF OBJECT_ID('borrow_requests', 'U') IS NOT NULL DROP TABLE borrow_requests; " +
                    "CREATE TABLE borrow_requests (" +
                    "request_id VARCHAR(36) NOT NULL PRIMARY KEY, " +
                    "item_id VARCHAR(36) NOT NULL, " +
                    "borrower_id VARCHAR(50) NOT NULL, " +
                    "start_date DATETIME2 NOT NULL, " +
                    "end_date DATETIME2 NOT NULL, " +
                    "reason NVARCHAR(MAX), " +
                    "response_reason NVARCHAR(MAX), " +
                    "request_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', " +
                    "created_at DATETIME2, " +
                    "updated_at DATETIME2, " +
                    "CONSTRAINT FK_borrow_requests_items FOREIGN KEY (item_id) REFERENCES items(item_id));"
                );
                log.info("[DatabaseSchemaRepair] Table 'borrow_requests' recreated successfully.");
            }

            if (legacyTables.contains("borrowing_transaction")) {
                log.info("[DatabaseSchemaRepair] Recreating table 'borrowing_transaction' with DATETIME2 columns...");
                jdbcTemplate.execute(
                    "IF OBJECT_ID('borrowing_transaction', 'U') IS NOT NULL DROP TABLE borrowing_transaction; " +
                    "CREATE TABLE borrowing_transaction (" +
                    "id VARCHAR(36) NOT NULL PRIMARY KEY, " +
                    "request_id VARCHAR(36) NOT NULL UNIQUE, " +
                    "borrower_id VARCHAR(50) NOT NULL, " +
                    "lender_id VARCHAR(50) NOT NULL, " +
                    "item_id VARCHAR(36) NOT NULL, " +
                    "status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', " +
                    "borrowed_at DATETIME2, " +
                    "returned_at DATETIME2, " +
                    "CONSTRAINT FK_borrowing_transaction_requests FOREIGN KEY (request_id) REFERENCES borrow_requests(request_id), " +
                    "CONSTRAINT FK_borrowing_transaction_items FOREIGN KEY (item_id) REFERENCES items(item_id));"
                );
                log.info("[DatabaseSchemaRepair] Table 'borrowing_transaction' recreated successfully.");
            }

            if (legacyTables.contains("evidence_proof")) {
                log.info("[DatabaseSchemaRepair] Recreating table 'evidence_proof' with DATETIME2 and NVARCHAR columns...");
                jdbcTemplate.execute(
                    "IF OBJECT_ID('evidence_proof', 'U') IS NOT NULL DROP TABLE evidence_proof; " +
                    "CREATE TABLE evidence_proof (" +
                    "id VARCHAR(36) NOT NULL PRIMARY KEY, " +
                    "transaction_id VARCHAR(36) NOT NULL, " +
                    "uploader_id VARCHAR(50) NOT NULL, " +
                    "proof_type VARCHAR(50) NOT NULL, " +
                    "image_url VARCHAR(500) NOT NULL, " +
                    "note NVARCHAR(MAX), " +
                    "captured_at DATETIME2, " +
                    "CONSTRAINT FK_evidence_proof_transaction FOREIGN KEY (transaction_id) REFERENCES borrowing_transaction(id));"
                );
                log.info("[DatabaseSchemaRepair] Table 'evidence_proof' recreated successfully.");
            }

            // ตรวจสอบให้แน่ใจว่าคอลัมน์ข้อความรองรับ Unicode (NVARCHAR) เสมอ
            jdbcTemplate.execute(
                "IF OBJECT_ID('items', 'U') IS NOT NULL BEGIN " +
                "ALTER TABLE items ALTER COLUMN title NVARCHAR(255) NOT NULL; " +
                "ALTER TABLE items ALTER COLUMN category NVARCHAR(100) NOT NULL; " +
                "ALTER TABLE items ALTER COLUMN description NVARCHAR(MAX); " +
                "END"
            );
            jdbcTemplate.execute(
                "IF OBJECT_ID('borrow_requests', 'U') IS NOT NULL BEGIN " +
                "ALTER TABLE borrow_requests ALTER COLUMN reason NVARCHAR(MAX); " +
                "ALTER TABLE borrow_requests ALTER COLUMN status VARCHAR(50); " +
                "END"
            );
            // ลบ CHECK constraint เก่าของสถานะคำขอยืม เพื่อให้บันทึกสถานะ CHANGE_REQUESTED ได้
            jdbcTemplate.execute(
                "DECLARE @sql NVARCHAR(MAX) = N''; " +
                "SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_NAME(cc.parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(cc.name) + N'; ' " +
                "FROM sys.check_constraints cc " +
                "JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id " +
                "WHERE cc.parent_object_id IN (OBJECT_ID('borrow_requests'), OBJECT_ID('borrow_requests')) " +
                "  AND c.name IN ('request_status', 'status'); " +
                "IF @sql <> N'' EXEC sp_executesql @sql;"
            );
            // อัปเดตคอลัมน์ในตาราง borrow_requests ให้รองรับภาษาไทยและข้อความตอบกลับ
            jdbcTemplate.execute(
                "IF OBJECT_ID('borrow_requests', 'U') IS NOT NULL BEGIN " +
                "IF COL_LENGTH('borrow_requests', 'reason') IS NOT NULL ALTER TABLE borrow_requests ALTER COLUMN reason NVARCHAR(MAX); " +
                "IF COL_LENGTH('borrow_requests', 'response_reason') IS NULL ALTER TABLE borrow_requests ADD response_reason NVARCHAR(MAX) NULL; " +
                "IF COL_LENGTH('borrow_requests', 'request_status') IS NOT NULL ALTER TABLE borrow_requests ALTER COLUMN request_status VARCHAR(50); " +
                "END"
            );
            jdbcTemplate.execute(
                "IF OBJECT_ID('users', 'U') IS NOT NULL BEGIN " +
                "IF COL_LENGTH('users', 'password_hash') IS NULL ALTER TABLE users ADD password_hash VARCHAR(255) NULL; " +
                "IF COL_LENGTH('users', 'role') IS NULL ALTER TABLE users ADD role VARCHAR(50) NULL DEFAULT 'STUDENT'; " +
                "IF COL_LENGTH('users', 'auth_provider') IS NULL ALTER TABLE users ADD auth_provider VARCHAR(50) NULL DEFAULT 'LOCAL'; " +
                "IF COL_LENGTH('users', 'department') IS NULL ALTER TABLE users ADD department NVARCHAR(255) NULL; " +
                "END"
            );
            // บังคับเปลี่ยน note ใน evidence_proof ให้เป็น NVARCHAR(MAX) เสมอแม้ตารางจะมีอยู่แล้ว
            jdbcTemplate.execute(
                "IF OBJECT_ID('evidence_proof', 'U') IS NOT NULL BEGIN " +
                "ALTER TABLE evidence_proof ALTER COLUMN note NVARCHAR(MAX); " +
                "ALTER TABLE evidence_proof ALTER COLUMN image_url VARCHAR(500) NOT NULL; " +
                "END"
            );
            // สร้างตาราง wanted_posts และ lend_offers (US-BRRQS) หากยังไม่มี
            jdbcTemplate.execute(
                "IF OBJECT_ID('wanted_posts', 'U') IS NULL CREATE TABLE wanted_posts (" +
                "id VARCHAR(36) PRIMARY KEY, " +
                "requester_id VARCHAR(50) NOT NULL, " +
                "title NVARCHAR(255) NOT NULL, " +
                "category NVARCHAR(100) NOT NULL, " +
                "description NVARCHAR(MAX) NULL, " +
                "needed_from DATETIME2 NULL, " +
                "needed_until DATETIME2 NULL, " +
                "status VARCHAR(50) NOT NULL DEFAULT 'OPEN', " +
                "created_at DATETIME2 DEFAULT SYSUTCDATETIME(), " +
                "updated_at DATETIME2 DEFAULT SYSUTCDATETIME(), " +
                "deleted_at DATETIME2 NULL)"
            );
            jdbcTemplate.execute(
                "IF OBJECT_ID('lend_offers', 'U') IS NULL CREATE TABLE lend_offers (" +
                "id VARCHAR(36) PRIMARY KEY, " +
                "wanted_post_id VARCHAR(36) NOT NULL, " +
                "lender_id VARCHAR(50) NOT NULL, " +
                "offered_item_id VARCHAR(36) NULL, " +
                "message NVARCHAR(MAX) NULL, " +
                "status VARCHAR(50) NOT NULL DEFAULT 'PENDING', " +
                "created_at DATETIME2 DEFAULT SYSUTCDATETIME(), " +
                "updated_at DATETIME2 DEFAULT SYSUTCDATETIME())"
            );
            log.info("[DatabaseSchemaRepair] Database schema verification and NVARCHAR column alignment completed.");
        } catch (Exception ex) {
            log.error("[DatabaseSchemaRepair] Failed to verify or repair database schema: {}", ex.getMessage(), ex);
        }
    }
}
