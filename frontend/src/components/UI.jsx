import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, UserRound, PackageOpen, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryLabel, normalizeCategoryKey } from "../data";
import { formatDate } from "../utils/date";

export function getLocalizedCategoryLabel(category, t) {
  if (!category) return "";
  const key = normalizeCategoryKey(category);
  return t ? t(`categories.${key}`, { defaultValue: getCategoryLabel(category) }) : getCategoryLabel(category);
}

export function CategoryBadge({ category, className = "" }) {
  const { t } = useTranslation();
  const label = getLocalizedCategoryLabel(category, t);
  if (!label) return null;
  return <span className={`category-label ${className}`.trim()}>{label}</span>;
}

export function AlertBanner({ message, onClose, type = "error", icon }) {
  const { t } = useTranslation();
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`}>
      {icon || <AlertCircle size={17} />}
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="alert-close" type="button" aria-label={t("common.close", { defaultValue: "ปิด" })}>
          {t("myListings.closeAlert", { defaultValue: "ปิด" })}
        </button>
      )}
    </div>
  );
}

const STATUS_CONFIG = {
  available: "badge-success",
  pending: "badge-warning",
  accepted: "badge-success",
  rejected: "badge-danger",
  reserved: "badge-warning",
  borrowed: "badge-neutral",
  unavailable: "badge-danger",
  change_requested: "badge-info",
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
  const displayStatus =
    String(item.status || "").toLowerCase() === "accepted"
      ? "reserved"
      : item.status;
  return <article className="item-card">
    <Link to={`/items/${item.id}`} className="item-image-wrap">
      {item.image ? <img src={item.image} alt={item.name} className="item-image" /> : <div className="image-placeholder"><PackageOpen size={42} /></div>}
      <span className="image-arrow"><ArrowUpRight size={16} /></span>
    </Link>
    <div className="item-card-body">
      <CategoryBadge category={item.category} />
      <Link to={`/items/${item.id}`} className="item-title">{item.name}</Link>
      <div className="item-owner"><span className="mini-avatar"><UserRound size={13} /></span>{item.owner}</div>
      <div className="item-card-bottom"><StatusBadge status={displayStatus} /><Link to={`/items/${item.id}`} className="text-link">{t("common.viewDetails")} <ArrowUpRight size={14} /></Link></div>
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

export function RequestCard({
  request,
  role = "owner",
  subtitle,
  actions,
}) {
  const { t, i18n } = useTranslation();
  if (!request) return null;

  const isOwner = role === "owner";
  const avatarName = isOwner ? request.borrower : request.itemName;
  const borrowDateLabel = isOwner
    ? t("incomingRequests.borrowDate", { defaultValue: "วันที่ต้องการยืม" })
    : t("myBorrows.borrowDate", { defaultValue: "วันที่ต้องการยืม" });
  const returnDateLabel = isOwner
    ? t("incomingRequests.returnDate", { defaultValue: "วันที่กำหนดคืน" })
    : t("myBorrows.returnDate", { defaultValue: "วันที่กำหนดคืน" });

  const defaultSubtitle = isOwner ? (
    <>
      {t("incomingRequests.requestedBy", { defaultValue: "ขอโดย" })}{" "}
      <strong>{request.borrower}</strong>
    </>
  ) : (
    t("myBorrows.requestedAt", {
      date: formatDate(request.borrowDate, i18n.language),
      defaultValue: `ส่งคำขอถึงเจ้าของเมื่อ ${formatDate(request.borrowDate, i18n.language)}`,
    })
  );

  return (
    <article className="request-card request-card-updated">
      <div className="request-main">
        <div className="request-card-top">
          <Avatar name={avatarName} />
          <div className="request-title">
            <h3>{request.itemName}</h3>
            <p>{subtitle !== undefined ? subtitle : defaultSubtitle}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <p className="request-reason">
          {!isOwner && t("myBorrows.reasonPrefix", { defaultValue: "เหตุผล: " })}
          {request.reason}
        </p>

        {request.responseReason && (
          isOwner ? (
            <p className="request-response-note">
              <strong>{t("incomingRequests.ownerFeedbackLabel", { defaultValue: "ข้อความตอบกลับของคุณ" })}</strong>
              {request.responseReason}
            </p>
          ) : (
            <p
              className={`request-feedback ${
                request.status === "rejected"
                  ? "request-feedback-rejected"
                  : "request-feedback-info"
              }`}
            >
              <strong>{t("myBorrows.ownerFeedback", { defaultValue: "ข้อความจากเจ้าของ: " })}</strong>
              {request.responseReason}
            </p>
          )
        )}
      </div>

      <div className="request-side">
        <dl className="request-dates">
          <div>
            <dt>{borrowDateLabel}</dt>
            <dd>{formatDate(request.borrowDate, i18n.language)}</dd>
          </div>
          <div>
            <dt>{returnDateLabel}</dt>
            <dd>{formatDate(request.returnDate, i18n.language)}</dd>
          </div>
        </dl>
        {actions}
      </div>
    </article>
  );
}
