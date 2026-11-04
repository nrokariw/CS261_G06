package com.example.demo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
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
            // ตรวจสอบว่าตารางเก่ามีคอลัมน์วันที่ที่ถูกสร้างเป็น varbinary จาก Hibernate หรือไม่
            List<String> legacyTables = jdbcTemplate.queryForList(
                "SELECT DISTINCT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS " +
                "WHERE TABLE_NAME IN ('borrow_request', 'borrowing_transaction', 'evidence_proof') " +
                "AND COLUMN_NAME IN ('start_date', 'end_date', 'created_at', 'borrowed_at', 'returned_at', 'captured_at') " +
                "AND DATA_TYPE = 'varbinary'",
                String.class
            );

            if (legacyTables.isEmpty()) {
                log.info("[DatabaseSchemaRepair] No legacy varbinary date columns detected.");
            } else {
                log.warn("[DatabaseSchemaRepair] Detected legacy varbinary date columns in tables: {}", legacyTables);
            }

            if (legacyTables.contains("borrow_request")) {
                log.info("[DatabaseSchemaRepair] Recreating table 'borrow_request' with DATETIME2 and NVARCHAR columns...");
                jdbcTemplate.execute(
                    "DROP TABLE borrow_request; " +
                    "CREATE TABLE borrow_request (" +
                    "id VARCHAR(255) NOT NULL PRIMARY KEY, " +
                    "item_id VARCHAR(255), " +
                    "borrower_id VARCHAR(255), " +
                    "start_date DATETIME2, " +
                    "end_date DATETIME2, " +
                    "reason NVARCHAR(MAX), " +
                    "status VARCHAR(50), " +
                    "created_at DATETIME2);"
                );
                log.info("[DatabaseSchemaRepair] Table 'borrow_request' recreated successfully.");
            }

            if (legacyTables.contains("borrowing_transaction")) {
                log.info("[DatabaseSchemaRepair] Recreating table 'borrowing_transaction' with DATETIME2 columns...");
                jdbcTemplate.execute(
                    "DROP TABLE borrowing_transaction; " +
                    "CREATE TABLE borrowing_transaction (" +
                    "id VARCHAR(255) NOT NULL PRIMARY KEY, " +
                    "request_id VARCHAR(255), " +
                    "borrower_id VARCHAR(255), " +
                    "lender_id VARCHAR(255), " +
                    "item_id VARCHAR(255), " +
                    "status VARCHAR(50), " +
                    "borrowed_at DATETIME2, " +
                    "returned_at DATETIME2);"
                );
                log.info("[DatabaseSchemaRepair] Table 'borrowing_transaction' recreated successfully.");
            }

            if (legacyTables.contains("evidence_proof")) {
                log.info("[DatabaseSchemaRepair] Recreating table 'evidence_proof' with DATETIME2 and NVARCHAR columns...");
                jdbcTemplate.execute(
                    "DROP TABLE evidence_proof; " +
                    "CREATE TABLE evidence_proof (" +
                    "id VARCHAR(255) NOT NULL PRIMARY KEY, " +
                    "transaction_id VARCHAR(255), " +
                    "uploader_id VARCHAR(255), " +
                    "proof_type VARCHAR(50), " +
                    "image_url VARCHAR(255), " +
                    "note NVARCHAR(MAX), " +
                    "captured_at DATETIME2);"
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
                "IF OBJECT_ID('borrow_request', 'U') IS NOT NULL BEGIN " +
                "ALTER TABLE borrow_request ALTER COLUMN reason NVARCHAR(MAX); " +
                "ALTER TABLE borrow_request ALTER COLUMN status VARCHAR(50); " +
                "END"
            );
            log.info("[DatabaseSchemaRepair] Database schema verification and NVARCHAR column alignment completed.");
        } catch (Exception ex) {
            log.error("[DatabaseSchemaRepair] Failed to verify or repair database schema: {}", ex.getMessage(), ex);
        }
    }
}
