// FIX : เลิกใช้ CATEGORIES แบบ fix 4 หมวด → ใช้เป็น "คำแนะนำ" ใน datalist เท่านั้น
// หมวดหมู่จริงที่ใช้กรองใน Browse จะดึงจากข้อมูลสิ่งของ 
export const CATEGORY_SUGGESTIONS = [
  "อุปกรณ์การเรียน",
  "อุปกรณ์อิเล็กทรอนิกส์",
  "อุปกรณ์กีฬา",
  "ของใช้ทั่วไป"
];

export const STORAGE_KEYS = {
  items: "campusshare-items-v2",
  requests: "campusshare-requests-v2"
};

export const ALL_CATEGORIES_ID = "__ALL__";

export const ITEM_STATUS = ["available", "reserved", "borrowed", "unavailable", "deleted"];
export const REQUEST_STATUS = ["pending", "accepted", "rejected", "cancelled"];

// FIX : ดึงหมวดหมู่จากสิ่งของจริง (ไม่รวมที่ถูกลบ) แทนการ hardcode
export function getCategories(items) {
  return Array.from(
    new Set(
      items
        .filter((i) => i.status !== "deleted")
        .map((i) => (i.category || "").trim())
        .filter(Boolean)
    )
  );
}

// ADD (จองคนละช่วงเวลา): สถานะที่ยังแสดงในหน้าค้นหาและยังขอยืมได้
// reserved/borrowed ยังขอยืมได้ถ้าช่วงวันที่ไม่ซ้อนกับคำขอที่ accepted ไปแล้ว
export const BORROWABLE_STATUS = ["available", "reserved", "borrowed"];

// ADD : เจ้าของกดยอมรับได้ถ้าช่วงวันที่ไม่ซ้อนกับคำขอ accepted อื่นของสิ่งของเดียวกัน
export function hasAcceptedOverlap(requests, req) {
  return requests.some(
    (r) =>
      r.id !== req.id &&
      r.itemId === req.itemId &&
      r.status === "accepted" &&
      req.borrowDate <= r.returnDate &&
      req.returnDate >= r.borrowDate
  );
}

// FIX : เช็กช่วงวันที่ซ้อนกับคำขอที่ pending/accepted ของสิ่งของเดียวกัน
// (รูปแบบวันที่ YYYY-MM-DD เทียบแบบสตริงได้เลย)
export function hasDateOverlap(requests, itemId, borrowDate, returnDate) {
  return requests.some(
    (r) =>
      r.itemId === itemId &&
      (r.status === "pending" || r.status === "accepted") &&
      borrowDate <= r.returnDate &&
      returnDate >= r.borrowDate
  );
}

export const SEED_ITEMS = [
  {
    id: "item-1",
    name: "เครื่องคิดเลขวิทยาศาสตร์",
    category: "อุปกรณ์การเรียน",
    detail: "Casio fx-991EX สภาพดี พร้อมใช้งาน เหมาะสำหรับใช้เรียนหรือสอบ",
    owner: "Ploy S.",
    image: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=80",
    status: "available"
  },
  {
    id: "item-2",
    name: "ขาตั้งกล้อง",
    category: "อุปกรณ์อิเล็กทรอนิกส์",
    detail: "ขาตั้งกล้องสีดำ ปรับระดับความสูงได้ เหมาะสำหรับถ่ายงานกลุ่ม",
    owner: "Mint P.",
    image: "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=900&q=80",
    status: "available"
  },
  {
    id: "item-3",
    name: "หนังสือเรียนชีววิทยา",
    category: "อุปกรณ์การเรียน",
    detail: "หนังสือสภาพดี มีรอยจดเล็กน้อย สามารถนัดรับที่ห้องสมุดได้",
    owner: "Boom T.",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80",
    status: "available"
  },
  {
    id: "item-4",
    name: "ไม้แบดมินตัน",
    category: "อุปกรณ์กีฬา",
    detail: "ไม้แบดมินตันสำหรับเล่นทั่วไป พร้อมซองใส่ไม้",
    owner: "Jane S.",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=80",
    status: "available"
  }
];

export const SEED_REQUESTS = [
  {
    id: "req-1", itemId: "item-1", itemName: "เครื่องคิดเลขวิทยาศาสตร์",
    borrower: "Narin K.", borrowDate: "2026-10-20", returnDate: "2026-10-22",
    reason: "ใช้สอบวิชาคณิตศาสตร์", status: "pending"
  },
  {
    // FIX: เดิม borrower = "Mint P." ซึ่งเป็นเจ้าของขาตั้งกล้องเอง (ยืมของตัวเอง)
    // เปลี่ยนเป็น "Ploy S." เพื่อให้ทดสอบหน้า /my-borrows ได้ (Ploy ขอยืมของ Mint)
    id: "req-2", itemId: "item-2", itemName: "ขาตั้งกล้อง",
    borrower: "Ploy S.", borrowDate: "2026-10-21", returnDate: "2026-10-23",
    reason: "ใช้ถ่ายวิดีโอสำหรับงานกลุ่ม", status: "pending"
  }
];
