# Database Scripts Organization

โครงสร้างโฟลเดอร์สำหรับจัดเก็บ SQL Scripts แยกตามประเภทของงาน:

## โครงสร้าง
- `schema/` — สำหรับสคริปต์สร้างฐานข้อมูล (Database) และโครงสร้างตารางเริ่มต้น (DDL / Tables) เช่น `DB_ITEM_TABLE.sql`
- `seeds/` — สำหรับสคริปต์เพิ่มข้อมูลเริ่มต้น, ข้อมูลทดสอบ หรือ Mock Data (DML / Insert)
- `migrations/` — สำหรับสคริปต์ปรับปรุงโครงสร้างตารางตามแต่ละ Sprint หรือ Version (Alter / Migration)

## การรันสคริปต์ผ่าน Container
สามารถรันสคริปต์ผ่าน Container `cs261-database` ได้โดยตรง เนื่องจากโฟลเดอร์นี้ถูก Mount เข้าไปที่ `/scripts` ใน Container ตัวอย่าง:

```bash
docker exec -i cs261-database /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "StrongPassw0rd!" -C -i /scripts/schema/DB_ITEM_TABLE.sql
```
