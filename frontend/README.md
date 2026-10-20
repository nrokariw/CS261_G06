# CampusShare — React UI Prototype

ระบบต้นแบบสำหรับยืมสิ่งของระหว่างนักศึกษา สร้างด้วย React + Vite + React Router + Lucide React

## วิธีเปิดโปรเจกต์

ต้องติดตั้ง Node.js รุ่น LTS ก่อน: https://nodejs.org/

เปิด Terminal แล้วรัน:

```bash
npm install
npm run dev
```

จากนั้นเปิด URL ที่ Vite แสดงใน Terminal โดยปกติคือ `http://localhost:(ตัวเลข)`

## Build ตรวจสอบโปรเจกต์

```bash
npm run build
npm run preview
```

## โครงสร้าง

```text
campusshare-react/
├── index.html
├── package.json
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── data.js
    ├── styles.css
    ├── components/
    │   └── UI.jsx
    └── pages/
        ├── Browse.jsx
        ├── CreateListing.jsx
        ├── ItemDetails.jsx
        ├── MyListings.jsx
        ├── IncomingRequests.jsx
        └── NotFound.jsx
```

## เส้นทางหน้าเว็บ

- `/` — Home / Browse Items
- `/create` — Create Listing
- `/items/:id` — Item Details & Borrow Request
- `/create?edit=item-1` — Edit Listing
- `/my-listings` — My Listings
- `/requests` — Incoming Requests

## ฟังก์ชัน

- ค้นหาชื่อสิ่งของ เจ้าของ และหมวดหมู่
- Client-side validation ของช่องบังคับ
- อัปโหลดรูปภาพและ preview
- ตรวจสอบวันที่ยืม/คืน
- แก้ไขและลบประกาศ
- Accept / Reject คำขอยืม

