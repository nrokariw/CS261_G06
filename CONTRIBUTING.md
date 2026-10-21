# แนวทางการทำงานร่วมกัน (CS261 Group 6 - 7 คน)

## TL;DR

```bash
git switch main && git pull
git switch -c <ประเภทของสิ่งที่จะทำ>/<สิ่งที่จะทำ>
# เช่น frontend/feat/create-card หรือ feat/create-card

# ...ทำงาน และ commit...
git fetch origin && git rebase origin/main
git push -u origin HEAD
gh pr create --fill # กรณีมี gh CLI ถ้าไม่มีให้กดเปิด PR บนเว็บ GitHub
```

---

## การรันระบบด้วย Docker และ Makefile

โปรเจกต์มี `Makefile` และ `.env` ที่รากของโปรเจกต์สำหรับจัดการ Container ทั้ง 3 ส่วน (`frontend`, `backend`, `database`) โดยระบบจะสร้างไฟล์ `.env` จาก `.env.example` ให้อัตโนมัติในการรันครั้งแรก

```bash
make all              # Build และรันทั้ง 3 บริการ (database, backend, frontend)
make frontend         # รันเฉพาะ frontend (พร้อมบริการที่ต้องพึ่งพา)
make backend          # รันเฉพาะ backend (พร้อม database)
make database         # รันเฉพาะฐานข้อมูล MSSQL
make start-only-frontend # รันเฉพาะ container นั้นเดี่ยวๆ โดยไม่รันบริการอื่นพ่วง
make up DB_MODE=edge  # สำหรับเครื่อง Mac ชิปตระกูล M ที่ต้องการรัน Azure SQL Edge แบบ native ARM64

make logs             # ดู log ของทุกบริการแบบต่อเนื่อง (หรือ make logs-backend)
make status           # ตรวจสอบสถานะ container ที่รันอยู่
make stop             # หยุดการทำงานของทุกบริการชั่วคราว
make down             # หยุดและลบ container
make clean            # ลบ container, network และล้างข้อมูล volume ของ DB ทั้งหมด
make fclean           # ล้างทั้งหมดรวมถึง Docker image ที่ถูกสร้างในเครื่อง
```

---

## Git Workflow

- `main` = โค้ดที่ทำงานได้เสมอ **ห้าม push ตรง** ทุกการเปลี่ยนแปลงต้องเข้าผ่าน Pull Request (PR) เท่านั้น
- 1 งาน = 1 branch โดยแตกจาก `main` ล่าสุดเสมอ
- ชื่อ branch (ยืดหยุ่นตามงาน):
  - กรณีมีรหัสใน Backlog: `<ประเภท>/<รหัส-task>-<ชื่อสั้นๆ>` เช่น `feat/US-01-create-listing`, `chore/INFRA-03-docker-setup`
  - กรณีงานทั่วไป: `<ประเภท>/<สิ่งที่ทำ>` เช่น `feat/frontend-setup`, `fix/item-validation`, `docs/readme`
- ก่อนเปิด PR: ดึงโค้ดล่าสุดจาก `main` (`git fetch origin && git rebase origin/main` หรือ `git pull origin main`) แล้วรันทดสอบ build/test ให้ผ่าน
- PR ต้องมีคนตรวจ (Review) อย่างน้อย 1 คน (ระบบจะดึง Scrum Master `@nrokariw` อัตโนมัติ)
- แล้วค่อยกด Merge (แนะนำ _Squash and merge_ หรือ _Merge commit_)
- ลบ branch ทิ้งหลังจาก Merge เข้า `main` เรียบร้อยแล้ว

### Commit Message

ใช้รูปแบบ Conventional Commits (ใส่รหัส Task ได้เมื่ออ้างอิงจาก Backlog):

```text
<ประเภท>(<ขอบเขต>): [<รหัส task>] <รายละเอียดสิ่งที่ทำ>
หรือ
<ประเภท>: <รายละเอียดสิ่งที่ทำ>

ตัวอย่าง:
feat(frontend): [US-01] เพิ่มหน้าสร้างประกาศสิ่งของให้ยืม
feat(backend): [US-03] เพิ่ม API สำหรับส่งคำขอยืมสิ่งของ
fix(backend): แก้ไขการตั้งค่า CORS และตรวจสอบสถานะสิ่งของ
chore(infra): [INFRA-03] ตั้งค่า Docker, docker-compose และ Makefile
refactor / test / docs / chore: ...
```

---

## โครงสร้างโค้ดและการเพิ่มฟีเจอร์ใหม่

### Backend (`backend/demo/src/main/java/com/example/demo/`)

จัดโครงสร้างแบบแยกตาม Layer ของสถาปัตยกรรม:

- `controller/` — รับ HTTP Request และกำหนด Endpoint (เช่น `ItemController.java`, `BorrowRequestController.java`)
- `service/` — จัดการ Business Logic และตรวจสอบเงื่อนไข
- `repository/` — เชื่อมต่อฐานข้อมูลผ่าน Spring Data JPA
- `model/` — คลาสข้อมูลและ Entity ในระบบ (เช่น `Item.java`, `BorrowRequest.java`, `Transaction.java`, `User.java`)
- `dto/` — คลาสรับ-ส่งข้อมูลระหว่าง API กับผู้เรียก
- `constant/` — ค่าคงที่และ Enum สถานะต่างๆ (เช่น `ItemStatus.java`, `RequestStatus.java`)
- `config/` — การตั้งค่าระบบ เช่น CORS และ External API (`CorsConfig.java`, `ExternalApiProperties.java`)
- เขียน Unit / Integration Test ไว้ใน `backend/demo/src/test/java/com/example/demo/`

### Frontend (`frontend/src/`)

พัฒนาด้วย React + Vite + React Router แยกตามหน้าที่ของไฟล์:

- `pages/` — คอมโพเนนต์ระดับหน้าเว็บตาม Route (เช่น `Browse.jsx`, `CreateListing.jsx`, `ItemDetails.jsx`)
- `components/` — UI คอมโพเนนต์ที่นำกลับมาใช้ซ้ำได้ (เช่น `UI.jsx`)
- `contexts/` — จัดการสถานะส่วนกลางของแอป (เช่น `AuthContext.jsx`)
- `App.jsx` — กำหนดเส้นทาง (Routes) และโครงสร้างหลักของหน้าเว็บ

### การตั้งค่า URL และ API Mapping (ห้าม Hardcode ในซอร์สโค้ด)

- **ห้าม** ฮาร์ดโค้ดโดเมนเนม พอร์ต หรือเส้นทาง API ลงในโค้ดโดยตรง
- ใช้การตั้งค่าจากไฟล์ `.env` ที่รากของโปรเจกต์เป็นจุดศูนย์กลาง (เมื่อเพิ่มตัวแปรใหม่ ให้อัปเดตลงใน `.env.example` ด้วยทุกครั้ง)
- ฝั่ง Frontend สามารถเรียกใช้ผ่านตัวแปร `import.meta.env.VITE_*` หรืออ่านจาก `/config.json` ที่ Nginx สร้างให้ตอนรัน container และส่งคำขอผ่าน `/api/...` ซึ่ง Nginx จะทำหน้าที่ Reverse Proxy ไปยัง Backend ให้อัตโนมัติ

### ไฟล์ส่วนกลางที่ใช้ร่วมกัน

ไฟล์ต่อไปนี้กระทบทั้งทีม หากต้องแก้ไขให้แจ้งในกลุ่มก่อน และแยกเป็น PR เล็กๆ เพื่อลดโอกาสเกิด Conflict:

- `docker-compose.yml`, `Makefile`, `.env.example`
- `backend/demo/pom.xml`, `backend/demo/src/main/resources/application.properties`
- `frontend/package.json`, `frontend/src/App.jsx`, `frontend/src/contexts/`

---

## แนวทางการจัดการฐานข้อมูลและไฟล์จัดเก็บ (MSSQL & Storage)

- **SQL Scripts (`database/scripts/`)**: จัดเก็บแยกตามประเภทการทำงาน
  - `schema/` — สำหรับสคริปต์สร้าง Database และตารางเริ่มต้น (DDL) เช่น `DB_ITEM_TABLE.sql`
  - `seeds/` — สำหรับสคริปต์ Mock Data หรือข้อมูลเริ่มต้น (DML)
  - `migrations/` — สำหรับสคริปต์ Alter Table / Migration ตามแต่ละ Sprint
- **Storage & Caching (`storage/`)**:
  - `storage/products/` — สำหรับจัดเก็บไฟล์รูปภาพสินค้า/สิ่งของที่อัปโหลด
  - `storage/temporary/` — สำหรับจัดเก็บไฟล์แคชหรือไฟล์อัปโหลดชั่วคราว
  - *(ไฟล์มีเดียและแคชถูกละเว้นใน `.gitignore` โดยอัตโนมัติ ห้ามลบ `.gitkeep`)*
- โครงสร้างตารางจัดการผ่าน JPA Entity ใน `backend/demo/src/main/java/com/example/demo/model/`
- สำหรับฟิลด์ที่ต้องเก็บข้อความภาษาไทย ให้ระบุชนิดข้อมูลเป็น `NVARCHAR` เสมอ (เช่น `@Column(columnDefinition = "NVARCHAR(255)")`) เพื่อป้องกันปัญหาตัวอักษรภาษาไทยเพี้ยนใน MSSQL
- หากมีการแก้ไขฟิลด์ใน Entity ที่กระทบโครงสร้างตารางเดิม ให้แจ้งในกลุ่มและระบุไว้ในคำอธิบาย PR
- กรณีที่ฐานข้อมูลในเครื่องพังหรือข้อมูลค้างระหว่างพัฒนา สามารถล้างและสร้าง container ฐานข้อมูลใหม่ได้ด้วยคำสั่ง:
  ```bash
  make clean && make database
  ```

---

## Checklist ก่อนเปิด PR

- [ ] ทดสอบฝั่ง Backend ผ่าน: `cd backend/demo && ./mvnw test`
- [ ] ทดสอบ Build ฝั่ง Frontend ผ่านโดยไม่มี Error: `cd frontend && npm run build`
- [ ] ทดสอบรันระบบรวมผ่าน Docker (`make all`) แล้วทำงานร่วมกันได้ปกติ
- [ ] ตรวจสอบ `git status` ว่าไม่มีไฟล์ `.env`, `target/`, `dist/`, `node_modules/`, `.DS_Store` ติดเข้าไปใน Commit
- [ ] หากมีการเพิ่มหรือเปลี่ยน API Path / ตัวแปรสภาพแวดล้อม ได้อัปเดตใน `.env.example` เรียบร้อยแล้ว
