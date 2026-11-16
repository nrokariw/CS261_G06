# แนวทางการทำงานร่วมกัน (CS261 Group 6 - 7 คน)

## TL;DR

```bash
# 1) งานพัฒนาทั่วไป (feat, fix, chore, docs, refactor, test) -> แตกจาก dev และเปิด PR เข้า dev
git fetch origin
git switch dev && git pull origin dev
git switch -c <ประเภทของสิ่งที่จะทำ>/<สิ่งที่จะทำ>
# เช่น feat/US-01-create-listing หรือ fix/item-validation

# ...ทำงาน และ commit...
git fetch origin && git rebase origin/dev
git push -u origin HEAD
gh pr create --base dev --fill # กรณีมี gh CLI ถ้าไม่มีให้กดเปิด PR เข้า branch dev บนเว็บ GitHub
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

## Git Workflow (GitFlow)

โปรเจกต์ใช้รูปแบบ **GitFlow** โดยแบ่งลำดับการไหลของโค้ดเป็น:
`feat/*, fix/*, ...` → `dev` → `release/*` → `main` (และมี `hotfix/*` สำหรับแก้บั๊กเร่งด่วนบน `main`)

### 1. โครงสร้างและบทบาทของแต่ละ Branch

1. **`main` (Production Branch)**
   - เก็บโค้ดที่เสถียรและพร้อมใช้งานจริงเสมอ **ห้าม push ตรงเด็ดขาด**
   - รับการ Merge จาก Pull Request ของ **`release/*`** หรือ **`hotfix/*`** เท่านั้น (ห้ามเปิด PR จาก `feat/*` หรือ `dev` ข้ามมาเข้า `main` โดยตรง)
2. **`dev` (Integration / Development Branch)**
   - เป็น Branch กลางสำหรับรวมโค้ดของทุกคนในระหว่าง Sprint **ห้าม push ตรง**
   - งานพัฒนาทุกชิ้น (`feat/*`, `fix/*`, `refactor/*`, `chore/*`, `docs/*`, `test/*`) ต้องแตกจาก `dev` และเปิด PR กลับเข้า `dev`
3. **`release/<เวอร์ชันหรือสปรินต์>` (Release Branch)**
   - เช่น `release/sprint-2`, `release/v1.0.0`
   - แตกจาก `dev` เมื่อฟีเจอร์ใน Sprint หรือรอบการส่งมอบนั้นครบแล้ว เพื่อทำ Integration Test / UAT และแก้บั๊กโค้งสุดท้ายก่อนปล่อย
   - เมื่อพร้อมส่งมอบ ให้เปิด PR จาก `release/*` เข้า **`main`** และต้องเปิด PR (หรือ Merge) ย้อนกลับเข้า **`dev`** ด้วยเสมอหากมีการแก้ไขเพิ่มเติมบน `release/*`
4. **`hotfix/<สิ่งที่แก้>` (Hotfix Branch สำหรับแก้ด่วนบน `main`)**
   - เช่น `hotfix/login-crash`, `hotfix/cors-production`
   - แตกจาก **`main`** โดยตรงเมื่อพบบั๊กร้ายแรงบน Production ที่รอรอบ Release ปกติไม่ได้
   - เมื่อแก้และทดสอบเสร็จ ให้เปิด PR เข้า **`main`** ทันที และ **ต้องเปิด PR / Merge ย้อนกลับเข้า `dev`** ด้วยทุกครั้งเพื่อไม่ให้บั๊กเดิมหลุดกลับมาในรอบถัดไป
5. **Feature / Task Branches (1 งาน = 1 Branch)**
   - แตกจาก `dev` ล่าสุดเสมอ โดยตั้งชื่อตามรูปแบบ:
     - กรณีมีรหัสใน Backlog: `<ประเภท>/<รหัส-task>-<ชื่อสั้นๆ>` เช่น `feat/US-01-create-listing`, `chore/INFRA-03-docker-setup`
     - กรณีงานทั่วไป: `<ประเภท>/<สิ่งที่ทำ>` เช่น `feat/frontend-setup`, `fix/item-validation`, `docs/readme`

### 2. ขั้นตอนการเปิด Pull Request ตามแต่ละกรณี

- **กรณีงานพัฒนาทั่วไป (`feat/*`, `fix/*`, `chore/*`, ฯลฯ → `dev`)**:
  ```bash
  git fetch origin
  git switch dev && git pull origin dev
  git switch -c feat/US-XX-short-name
  # ...พัฒนาและ commit...
  git fetch origin && git rebase origin/dev   # หรือ git merge origin/dev
  git push -u origin HEAD
  gh pr create --base dev --fill
  ```
- **กรณีเตรียมปล่อยเวอร์ชัน (`dev` → `release/*` → `main`)**:
  ```bash
  git fetch origin
  git switch dev && git pull origin dev
  git switch -c release/sprint-2
  git push -u origin release/sprint-2
  # เมื่อทดสอบผ่านและพร้อมปล่อยเข้า main:
  gh pr create --base main --head release/sprint-2 --fill
  # และหากมี commit แก้บั๊กเพิ่มบน release/* ให้เปิด PR ย้อนกลับเข้า dev ด้วย:
  gh pr create --base dev --head release/sprint-2 --fill
  ```
- **กรณีแก้บั๊กเร่งด่วนบน Production (`main` → `hotfix/*` → `main` & `dev`)**:
  ```bash
  git fetch origin
  git switch main && git pull origin main
  git switch -c hotfix/critical-bug
  # ...แก้ไขบั๊ก ทดสอบ และ commit...
  git push -u origin hotfix/critical-bug
  # 1) เปิด PR เข้า main เพื่อแก้ด่วน
  gh pr create --base main --head hotfix/critical-bug --fill
  # 2) เปิด PR ย้อนกลับเข้า dev เพื่อซิงก์โค้ดให้ตรงกัน
  gh pr create --base dev --head hotfix/critical-bug --fill
  ```

### 3. กฎการ Review และ Merge PR

- ก่อนเปิด PR: ดึงโค้ดล่าสุดจาก Branch ปลายทาง (`origin/dev` สำหรับงานทั่วไป หรือ `origin/main` สำหรับ `hotfix/*`) แล้วรันทดสอบ Build/Test ให้ผ่าน
- PR ต้องมีคนตรวจ (Review) อย่างน้อย 1 คน (ระบบจะดึง Scrum Master `@nrokariw` อัตโนมัติ) และผ่าน GitHub Actions (`GitFlow & CI Check`)
- แล้วค่อยกด Merge (แนะนำ _Squash and merge_ หรือ _Merge commit_)
- ลบ Feature / Release / Hotfix branch ทิ้งหลังจาก Merge เรียบร้อยแล้ว

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
  - `schema/` — สำหรับสคริปต์สร้าง Database และตารางเริ่มต้น (DDL) เช่น `OUR_PROJECT_DB.sql`
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

- [ ] เปิด PR ไปยัง Branch ปลายทางตาม GitFlow (`feat/*, fix/*` → `dev`, `release/*` → `main`, `hotfix/*` → `main` & `dev`)
- [ ] ดึงโค้ดล่าสุดจาก Branch ปลายทาง (`origin/dev` หรือ `origin/main` สำหรับ `hotfix/*`) และแก้ Conflict เรียบร้อยแล้ว
- [ ] ทดสอบฝั่ง Backend ผ่าน: `cd backend/demo && ./mvnw test`
- [ ] ทดสอบ Build ฝั่ง Frontend ผ่านโดยไม่มี Error: `cd frontend && npm run build`
- [ ] ทดสอบรันระบบรวมผ่าน Docker (`make all`) แล้วทำงานร่วมกันได้ปกติ
- [ ] ตรวจสอบ `git status` ว่าไม่มีไฟล์ `.env`, `target/`, `dist/`, `node_modules/`, `.DS_Store` ติดเข้าไปใน Commit
- [ ] หากมีการเพิ่มหรือเปลี่ยน API Path / ตัวแปรสภาพแวดล้อม ได้อัปเดตใน `.env.example` เรียบร้อยแล้ว
