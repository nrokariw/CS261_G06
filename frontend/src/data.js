export const CATEGORIES = [
  "อุปกรณ์การเรียน",
  "อุปกรณ์อิเล็กทรอนิกส์",
  "อุปกรณ์กีฬา",
  "ของใช้ทั่วไป"
];

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
    id: "req-2", itemId: "item-2", itemName: "ขาตั้งกล้อง",
    borrower: "Mint P.", borrowDate: "2026-10-21", returnDate: "2026-10-23",
    reason: "ใช้ถ่ายวิดีโอสำหรับงานกลุ่ม", status: "pending"
  }
];
