import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, UserRound, PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryLabel, normalizeCategoryKey } from "../data";

const STATUS_CONFIG = {
  available: "badge-success",
  pending: "badge-warning",
  accepted: "badge-success",
  rejected: "badge-danger",
};

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>;
}

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  const normalized = String(status || "").toLowerCase();
  const cls = STATUS_CONFIG[normalized] || "badge-neutral";
  const label = t(`status.${normalized}`, { defaultValue: status });
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function ItemCard({ item }) {
  const { t } = useTranslation();
  const categoryKey = normalizeCategoryKey(item.category);
  const categoryLabel = t(`categories.${categoryKey}`, {
    defaultValue: getCategoryLabel(item.category),
  });
  return <article className="item-card">
    <Link to={`/items/${item.id}`} className="item-image-wrap">
      {item.image ? <img src={item.image} alt={item.name} className="item-image" /> : <div className="image-placeholder"><PackageOpen size={42} /></div>}
      <span className="image-arrow"><ArrowUpRight size={16} /></span>
    </Link>
    <div className="item-card-body">
      <span className="category-label">{categoryLabel}</span>
      <Link to={`/items/${item.id}`} className="item-title">{item.name}</Link>
      <div className="item-owner"><span className="mini-avatar"><UserRound size={13} /></span>{item.owner}</div>
      <div className="item-card-bottom"><StatusBadge status={item.status} /><Link to={`/items/${item.id}`} className="text-link">{t("common.viewDetails")} <ArrowUpRight size={14} /></Link></div>
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
