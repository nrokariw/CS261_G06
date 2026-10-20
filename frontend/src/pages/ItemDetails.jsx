import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  UserRound,
  Send,
} from "lucide-react";
import { PageHeading, StatusBadge } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

export default function ItemDetails({ items, setRequests }) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const item = items.find((i) => i.id === id && i.status !== "deleted");
  const [borrowDate, setBorrowDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (!borrowDate) next.borrowDate = "กรุณาเลือกวันที่ยืม";
    if (!returnDate) next.returnDate = "กรุณาเลือกวันที่คืน";
    if (borrowDate && borrowDate < today)
      next.borrowDate = "วันที่ยืมต้องไม่เป็นวันในอดีต";
    if (borrowDate && returnDate && returnDate < borrowDate)
      next.returnDate = "วันที่คืนต้องไม่อยู่ก่อนวันที่ยืม";
    if (!reason.trim()) next.reason = "กรุณาระบุเหตุผลการยืม";
    setErrors(next);
    if (Object.keys(next).length) return;
    setRequests((prev) => [
      {
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        borrower: user.name,
        borrowDate,
        returnDate,
        reason: reason.trim(),
        status: "pending",
      },
      ...prev,
    ]);
    setSuccess(true);
  }

  if (!item)
    return (
      <div className="not-found">
        <h1>ไม่พบสิ่งของนี้</h1>
        <Link className="button button-primary" to="/">
          กลับหน้าหลัก
        </Link>
      </div>
    );

  return (
    <div className="page-stack">
      <div className="detail-page-heading">
        <div className="eyebrow">ITEM DETAILS</div>
      </div>
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> กลับไปหน้าค้นหา
      </button>
      <div className="detail-layout">
        <section className="detail-main">
          <div className="detail-image">
            {item.image ? (
              <img src={item.image} alt={item.name} />
            ) : (
              <div className="image-placeholder">
                <CalendarDays size={48} />
              </div>
            )}
          </div>
          <div className="detail-thumbnails">
            {item.image && <img src={item.image} alt="" />}
            {item.image && <img src={item.image} alt="" />}
            {item.image && <img src={item.image} alt="" />}
          </div>
          <div className="detail-info">
            <StatusBadge status={item.status} />
            <span className="category-label">{item.category}</span>
            <h1>{item.name}</h1>
            <div className="owner-row">
              <span className="owner-avatar">
                <UserRound size={20} />
              </span>
              <div>
                <strong>{item.owner}</strong>
                <small>เจ้าของสิ่งของ</small>
              </div>
              <span className="verified">
                <ShieldCheck size={15} /> สมาชิก
              </span>
            </div>
            <hr />
            <h2>รายละเอียดสิ่งของ</h2>
            <p>{item.detail}</p>
            <div className="detail-meta">
              <span>
                <MapPin size={16} /> นัดรับภายในมหาวิทยาลัย
              </span>
              <span>
                <ShieldCheck size={16} /> โปรดรักษาสิ่งของและคืนตรงเวลา
              </span>
            </div>
          </div>
        </section>
        <aside className="borrow-panel">
          <div className="borrow-panel-heading">
            <span className="panel-icon">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2>ส่งคำขอยืม</h2>
              <p>ระบุช่วงเวลาที่ต้องการยืม</p>
            </div>
          </div>
          {success ? (
            <div className="request-success">
              <span>
                <CheckCircle2 size={28} />
              </span>
              <h3>ส่งคำขอเรียบร้อยแล้ว!</h3>
              <p>เจ้าของสิ่งของจะตรวจสอบคำขอของคุณ</p>
              <button
                className="button button-primary button-full"
                onClick={() => navigate("/my-listings")}
              >
                กลับไปหน้าประกาศ
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="borrowDate">
                  วันที่ยืม <span className="required">*</span>
                </label>
                <input
                  id="borrowDate"
                  type="date"
                  min={today}
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  aria-invalid={!!errors.borrowDate}
                />
                {errors.borrowDate && (
                  <small className="field-error">{errors.borrowDate}</small>
                )}
              </div>
              <div className="field">
                <label htmlFor="returnDate">
                  วันที่คืน <span className="required">*</span>
                </label>
                <input
                  id="returnDate"
                  type="date"
                  min={borrowDate || today}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  aria-invalid={!!errors.returnDate}
                />
                {errors.returnDate && (
                  <small className="field-error">{errors.returnDate}</small>
                )}
              </div>
              <div className="field">
                <label htmlFor="reason">
                  เหตุผลการยืม <span className="required">*</span>
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="เช่น ใช้ทำงานกลุ่มหรือทำรายงาน..."
                  aria-invalid={!!errors.reason}
                />
                {errors.reason && (
                  <small className="field-error">{errors.reason}</small>
                )}
                <small className="helper-text">
                  {reason.length}/300 ตัวอักษร
                </small>
              </div>
              <div className="borrow-note">
                <ShieldCheck size={17} />
                <span>คำขอจะถูกส่งให้เจ้าของพิจารณาก่อนยืนยันการยืม</span>
              </div>
              <button
                className="button button-primary button-full"
                type="submit"
              >
                <Send size={16} /> ส่งคำขอยืม
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
