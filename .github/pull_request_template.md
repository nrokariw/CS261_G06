## สรุปการเปลี่ยนแปลง (Summary)

<!-- อธิบายสั้นๆ ว่า PR นี้ทำอะไร แก้ไขหรือเพิ่มส่วนไหน และทำไม -->

-

## งานที่เกี่ยวข้อง (Related Issue / Backlog Task) (Optional)

<!-- ระบุเลข Issue เพื่อให้ปิดอัตโนมัติเมื่อ Merge เช่น Closes #12 หรือระบุรหัสงาน เช่น US-01, INFRA-03 -->

- Task / Story ID:
- Related Issue: Closes #

## ประเภทของการเปลี่ยนแปลง (Type of Change)

- [ ] `feat`: เพิ่มฟีเจอร์ใหม่
- [ ] `fix`: แก้ไขบั๊กหรือข้อผิดพลาด
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

- [ ] ดึงโค้ดล่าสุดจาก `main` (`git fetch origin && git rebase origin/main`) และแก้ Conflict เรียบร้อยแล้ว
- [ ] ทดสอบฝั่ง Backend ผ่าน (`cd backend/demo && ./mvnw test`)
- [ ] ทดสอบ Build ฝั่ง Frontend ผ่านโดยไม่มี Error (`cd frontend && npm run build`)
- [ ] ทดสอบรันระบบรวมผ่าน Docker (`make all`) แล้วทำงานร่วมกันได้ปกติ
- [ ] ไม่มีไฟล์ `.env`, `target/`, `dist/`, `node_modules/`, `.DS_Store` ติดเข้าไปใน Commit
- [ ] ทำตามข้อกำหนดใน CONTRIBUTING.md ครบถ้วน
