import React from "react";
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-code">404</div>
      <div className="eyebrow">PAGE NOT FOUND</div>
      <h1>ไม่พบหน้าที่ต้องการ</h1>
      <p>หน้าที่คุณเปิดอาจถูกย้ายหรือลบไปแล้ว</p>
      <Link to="/" className="button button-primary">
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
