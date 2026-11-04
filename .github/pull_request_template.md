## สรุปการเปลี่ยนแปลง (Summary)

<!-- อธิบายสั้นๆ ว่า PR นี้ทำอะไร แก้ไขหรือเพิ่มส่วนไหน และทำไม -->

-

## งานที่เกี่ยวข้อง (Related Issue / Backlog Task) (Optional)

<!-- ระบุเลข Issue เพื่อให้ปิดอัตโนมัติเมื่อ Merge เช่น Closes #12 หรือระบุรหัสงาน เช่น US-01, INFRA-03 -->

- Task / Story ID:
- Related Issue: Closes #

## ทิศทางของ Pull Request (GitFlow Target)

- [ ] งานพัฒนาทั่วไป (`feat/*`, `fix/*`, `refactor/*`, `chore/*`, `docs/*`, `test/*` → `dev`)
- [ ] เตรียมปล่อยเวอร์ชัน (`release/*` → `main` หรือซิงก์กลับเข้า `dev`)
- [ ] แก้ไขบั๊กเร่งด่วนบน Production (`hotfix/*` → `main` และซิงก์กลับเข้า `dev`)

## ประเภทของการเปลี่ยนแปลง (Type of Change)

- [ ] `feat`: เพิ่มฟีเจอร์ใหม่
- [ ] `fix`: แก้ไขบั๊กหรือข้อผิดพลาด
- [ ] `hotfix`: แก้ไขบั๊กร้ายแรงเร่งด่วนบน `main`
- [ ] `release`: เตรียมโค้ดสำหรับส่งมอบเวอร์ชัน/สปรินต์
- [ ] `refactor`: ปรับปรุงโครงสร้างโค้ดโดยไม่เปลี่ยนพฤติกรรมการทำงานเดิม
- [ ] `chore`: งานตั้งค่าระบบ, Docker, Makefile หรือ Dependency
- [ ] `docs`: แก้ไขหรือเพิ่มเติมเอกสาร
- [ ] `test`: เพิ่มหรือแก้ไขชุดทดสอบ

## ส่วนของระบบที่ได้รับผลกระทบ (Affected Scope)

- [ ] Frontend (`frontend/`)
- [ ] Backend (`backend/demo/`)
- [ ] Database (`database/` หรือ JPA Entity ใน `model/`)
- [ ] Docker / Infrastructure (`docker-compose.yml`, `Makefile`, `Dockerfile`, `.env.example`)
- [ ] ไฟล์ส่วนกลางที่ใช้ร่วมกัน (`pom.xml`, `package.json`, `App.jsx`, `contexts/`, `application.properties`) — _แจ้งในกลุ่มแล้ว_

## วิธีการทดสอบและหลักฐาน (How to Test / Screenshots)

<!-- อธิบายขั้นตอนการทดสอบ หรือแนบภาพหน้าจอ / ผลลัพธ์ API (กรณีแก้ UI หรือ Endpoint) -->

1.
2.

## Checklist ก่อนเปิด PR

- [ ] เปิด PR ไปยัง Branch ปลายทางที่ถูกต้องตาม GitFlow (`feat/*, fix/*` → `dev`, `release/*` → `main`, `hotfix/*` → `main` & `dev`)
- [ ] ดึงโค้ดล่าสุดจาก Branch ปลายทาง (`git fetch origin && git rebase origin/dev` หรือ `origin/main` สำหรับ `hotfix/*`) และแก้ Conflict เรียบร้อยแล้ว
- [ ] ทดสอบฝั่ง Backend ผ่าน (`cd backend/demo && ./mvnw test`)
- [ ] ทดสอบ Build ฝั่ง Frontend ผ่านโดยไม่มี Error (`cd frontend && npm run build`)
- [ ] ทดสอบรันระบบรวมผ่าน Docker (`make all`) แล้วทำงานร่วมกันได้ปกติ
- [ ] ไม่มีไฟล์ `.env`, `target/`, `dist/`, `node_modules/`, `.DS_Store` ติดเข้าไปใน Commit
- [ ] ทำตามข้อกำหนดใน CONTRIBUTING.md ครบถ้วน
