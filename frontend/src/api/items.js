// ดึง Path ของ API จากตัวแปร Environment (หากไม่มีให้ใช้ค่าเริ่มต้น)
const ITEMS_API_PATH = import.meta.env.VITE_API_ITEMS_PATH || "/api/items";

// ฟังก์ชันดึงรายการสิ่งของทั้งหมดที่พร้อมให้ยืม
export async function fetchItems(token, status = "AVAILABLE") {
  // ใช้ตัวแปร ITEMS_API_PATH แทนการฮาร์ดโค้ด
  const response = await fetch(`${ITEMS_API_PATH}?status=${status}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  // ป้องกันแอปพัง หากเซิร์ฟเวอร์ไม่ได้ตอบเป็น JSON
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็นข้อมูล JSON (Backend อาจยังไม่รัน)");
  }

  if (!response.ok) {
    throw new Error("ไม่สามารถดึงข้อมูลรายการสิ่งของได้");
  }
  return response.json();
}

// ฟังก์ชันดึงรายละเอียดสิ่งของตาม ID
export async function fetchItemById(id, token) {
  // ใช้ตัวแปร ITEMS_API_PATH แทนการฮาร์ดโค้ด
  const response = await fetch(`${ITEMS_API_PATH}/${id}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็นข้อมูล JSON (Backend อาจยังไม่รัน)");
  }

  if (response.status === 404) {
    throw new Error("ไม่พบสิ่งของชิ้นนี้ในระบบ");
  }
  if (!response.ok) {
    throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูล");
  }
  return response.json();
}