import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, UserRound, PackageOpen } from "lucide-react";

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>;
}

export function StatusBadge({ status }) {
  const map = {
    available: ["พร้อมให้ยืม", "badge-success"],
    pending: ["รอพิจารณา", "badge-warning"],
    accepted: ["ยอมรับแล้ว", "badge-success"],
    rejected: ["ปฏิเสธแล้ว", "badge-danger"]
  };
  const [label, cls] = map[status] || [status, "badge-neutral"];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function ItemCard({ item }) {
  return <article className="item-card">
    <Link to={`/items/${item.id}`} className="item-image-wrap">
      {item.image ? <img src={item.image} alt={item.name} className="item-image" /> : <div className="image-placeholder"><PackageOpen size={42} /></div>}
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
