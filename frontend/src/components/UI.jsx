import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, UserRound, PackageOpen } from "lucide-react";

// FIX : ตรวจ protocol ของรูปก่อน render
// อนุญาตเฉพาะ http(s) และ data:image ที่เป็น jpeg/png/webp
export function safeImageSrc(src) {
  if (typeof src !== "string") return "";
  if (/^https?:\/\//i.test(src)) return src;
  if (/^data:image\/(jpeg|png|webp);base64,/i.test(src)) return src;
  return "";
}

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>;
}

export function StatusBadge({ status }) {
  // ✅ FIX (Step 1/3/5): เพิ่มสถานะที่ขาดตาม spec — reserved, borrowed, unavailable, cancelled
  const map = {
    available: ["พร้อมให้ยืม", "badge-success"],
    reserved: ["รอส่งมอบ", "badge-warning"],
    borrowed: ["กำลังถูกยืม", "badge-neutral"],
    unavailable: ["ปิดให้ยืมชั่วคราว", "badge-neutral"],
    pending: ["รอพิจารณา", "badge-warning"],
    accepted: ["ยอมรับแล้ว", "badge-success"],
    rejected: ["ปฏิเสธแล้ว", "badge-danger"],
    cancelled: ["ยกเลิกแล้ว", "badge-neutral"]
  };
  const [label, cls] = map[status] || [status, "badge-neutral"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function ItemCard({ item }) {
  const imageSrc = safeImageSrc(item.image); // ✅ FIX (audit 1.4)
  return <article className="item-card">
    <Link to={`/items/${item.id}`} className="item-image-wrap">
      {imageSrc ? <img src={imageSrc} alt={item.name} className="item-image" /> : <div className="image-placeholder"><PackageOpen size={42} /></div>}
      <span className="image-arrow"><ArrowUpRight size={16} /></span>
    </Link>
    <div className="item-card-body">
      <span className="category-label">{item.category}</span>
      <Link to={`/items/${item.id}`} className="item-title">{item.name}</Link>
      <div className="item-owner"><span className="mini-avatar"><UserRound size={13} /></span>{item.owner}</div>
      <div className="item-card-bottom"><StatusBadge status={item.status} /><Link to={`/items/${item.id}`} className="text-link">ดูรายละเอียด <ArrowUpRight size={14} /></Link></div>
    </div>
  </article>;
}

export function EmptyState({ title, description }) {
  return <div className="empty-state"><span className="empty-icon"><PackageOpen size={28} /></span><h3>{title}</h3><p>{description}</p></div>;
}

export function Avatar({ name, size = "md" }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  return <span className={`avatar avatar-${size}`} aria-hidden="true">{letter}</span>;
}