# Database Scripts Organization

โครงสร้างโฟลเดอร์สำหรับจัดเก็บ SQL Scripts แยกตามประเภทของงาน:

## โครงสร้าง
- `schema/` — สำหรับสคริปต์สร้างฐานข้อมูล (Database) และโครงสร้างตารางเริ่มต้น (DDL / Tables) เช่น `OUR_PROJECT_DB.sql`
- `schema/` — สำหรับสคริปต์สร้างฐานข้อมูล (Database) และโครงสร้างตารางเริ่มต้น (DDL / Tables) เช่น `OUR_PROJECT_DB.sql`
- `seeds/` — สำหรับสคริปต์เพิ่มข้อมูลเริ่มต้น, ข้อมูลทดสอบ หรือ Mock Data (DML / Insert)
- `migrations/` — สำหรับสคริปต์ปรับปรุงโครงสร้างตารางตามแต่ละ Sprint หรือ Version (Alter / Migration)

## การรันสคริปต์ผ่าน Container
สามารถรันสคริปต์ผ่าน Container `cs261-database` ได้โดยตรง เนื่องจากโฟลเดอร์นี้ถูก Mount เข้าไปที่ `/scripts` ใน Container ตัวอย่าง:

```bash
# รัน DDL Schema สำหรับสร้าง Database และ Table เริ่มต้น
docker exec -i cs261-database /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "StrongPassw0rd!" -v DB_NAME="our_project_db" -C -i /scripts/schema/OUR_PROJECT_DB.sql

# รันสคริปต์ Seeds หรือ Migrations (กำหนดเป้าหมายฐานข้อมูลด้วย -d our_project_db)
docker exec -i cs261-database /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "StrongPassw0rd!" -d our_project_db -C -i /scripts/seeds/01_seed_demo_accounts.sql
```
