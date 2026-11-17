import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, UserRound, PackageOpen, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CATEGORY_LABELS,
  getCategoryDefinition,
  getCategoryLabel,
  normalizeCategoryKey,
} from "../data";
import { formatDate } from "../utils/date";

export function getLocalizedCategoryLabel(category, t, language) {
  if (!category) return "";
  const key = normalizeCategoryKey(category);
  if (key === "ALL") {
    return t ? t("categories.ALL", { defaultValue: CATEGORY_LABELS.ALL }) : CATEGORY_LABELS.ALL;
  }
  const lang = language || t?.i18n?.language || "th";
  const def = getCategoryDefinition(key);
  if (def && (def.nameTh || def.nameEn)) {
    const isEn = String(lang).toLowerCase().startsWith("en");
    return isEn ? def.nameEn || def.nameTh : def.nameTh || def.nameEn;
  }
  return t
    ? t(`categories.${key}`, { defaultValue: getCategoryLabel(category, lang) })
    : getCategoryLabel(category, lang);
}

export function CategoryBadge({ category, className = "" }) {
  const { t, i18n } = useTranslation();
  const label = getLocalizedCategoryLabel(category, t, i18n.language);
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
  open: "badge-success",
  pending: "badge-warning",
  accepted: "badge-success",
  fulfilled: "badge-info",
  rejected: "badge-danger",
  cancelled: "badge-danger",
  reserved: "badge-warning",
  borrowed: "badge-neutral",
  withdrawn: "badge-neutral",
  returned: "badge-info",
  unavailable: "badge-danger",
  change_requested: "badge-info",
};

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[var(--border)]">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-1.5 mb-0 text-[26px] sm:text-[28px] font-bold leading-tight tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 mb-0 text-[13px] text-[var(--muted)] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
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
  return (
    <article className="group flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--primary)]/40 transition-all duration-200">
      <Link
        to={`/items/${item.id}`}
        className="relative block aspect-[16/10] bg-[var(--surface-subtle)] overflow-hidden"
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-[var(--muted)] bg-[var(--surface-subtle)]">
            <PackageOpen size={42} />
          </div>
        )}
        <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--surface)]/90 backdrop-blur-xs border border-[var(--border)] grid place-items-center text-[var(--text)] opacity-0 group-hover:opacity-100 group-hover:bg-[var(--primary)] group-hover:text-white group-hover:border-[var(--primary)] transition-all duration-150 shadow-xs">
          <ArrowUpRight size={16} />
        </span>
      </Link>
      <div className="flex flex-col flex-1 p-4">
        <div className="flex-1 flex flex-col">
          <CategoryBadge category={item.category} />
          <Link
            to={`/items/${item.id}`}
            className="mt-2 text-[15px] font-semibold text-[var(--text)] hover:text-[var(--primary)] no-underline leading-snug line-clamp-2 transition-colors"
          >
            {item.name}
          </Link>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Avatar name={item.owner} size="xs" />
            <span className="truncate" title={item.owner}>{item.owner}</span>
          </div>
        </div>
        <div className="mt-3.5 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2.5">
          <StatusBadge status={displayStatus} />
          <Link to={`/items/${item.id}`} className="text-link">
            {t("common.viewDetails")} <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-[14px]">
      <span className="w-14 h-14 rounded-2xl bg-[var(--surface-tint)] text-[var(--primary)] grid place-items-center mb-3.5">
        <PackageOpen size={28} />
      </span>
      <h3 className="m-0 text-base font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1.5 mb-0 text-[13px] text-[var(--muted)] max-w-md leading-relaxed">
        {description}
      </p>
    </div>
  );
}

const AVATAR_SIZE_CLASSES = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
};

export function Avatar({ name, size = "md" }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase();
  const sizeClass = AVATAR_SIZE_CLASSES[size] || AVATAR_SIZE_CLASSES.md;
  return (
    <span
      className={`inline-grid place-items-center rounded-full font-bold bg-[var(--peach)] text-[var(--primary)] border border-[var(--border)] shrink-0 select-none ${sizeClass}`}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

export function RequestCard({
  request,
  role = "owner",
  status,
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
    <article className="flex flex-col md:flex-row justify-between gap-5 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <Avatar name={avatarName} />
          <div className="min-w-0 flex-1">
            <h3 className="m-0 text-base font-semibold text-[var(--text)] truncate">
              {request.itemName}
            </h3>
            <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
              {subtitle !== undefined ? subtitle : defaultSubtitle}
            </p>
          </div>
          <StatusBadge status={status || request.status} />
        </div>

        <p className="mt-3 mb-0 text-[13px] leading-relaxed text-[var(--text)] break-words">
          {!isOwner && t("myBorrows.reasonPrefix", { defaultValue: "เหตุผล: " })}
          {request.reason}
        </p>

        {request.responseReason && (
          isOwner ? (
            <p className="mt-2.5 mb-0 px-3 py-2 rounded-lg text-[13px] text-[var(--muted)] bg-[var(--surface-subtle)] border-l-[3px] border-[#0284c7] dark:border-[#38bdf8]">
              <strong className="text-[var(--text)] mr-1">
                {t("incomingRequests.ownerFeedbackLabel", { defaultValue: "ข้อความตอบกลับของคุณ:" })}
              </strong>
              {request.responseReason}
            </p>
          ) : (
            <p
              className={`mt-2.5 mb-0 px-3 py-2 rounded-lg text-[13px] border-l-[3px] ${
                request.status === "rejected"
                  ? "bg-[#FCE8E4] text-[#B9382B] border-[#B9382B] dark:bg-[#3B1C18] dark:text-[#FCA5A5] dark:border-[#F87171]"
                  : "bg-[#E0F2FE] text-[#0369A1] border-[#0284c7] dark:bg-[#172E48] dark:text-[#7DD3FC] dark:border-[#38bdf8]"
              }`}
            >
              <strong className="mr-1">
                {t("myBorrows.ownerFeedback", { defaultValue: "ข้อความจากเจ้าของ: " })}
              </strong>
              {request.responseReason}
            </p>
          )
        )}
      </div>

      <div className="md:w-72 lg:w-80 shrink-0 flex flex-col justify-between gap-3.5 pt-4 border-t border-[var(--border)] md:pt-0 md:border-t-0 md:border-l md:pl-5">
        <dl className="grid grid-cols-2 gap-3 m-0">
          <div>
            <dt className="text-[11px] font-medium text-[var(--muted)]">{borrowDateLabel}</dt>
            <dd className="m-0 mt-0.5 text-[13px] font-semibold text-[var(--text)]">
              {formatDate(request.borrowDate, i18n.language)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-[var(--muted)]">{returnDateLabel}</dt>
            <dd className="m-0 mt-0.5 text-[13px] font-semibold text-[var(--text)]">
              {formatDate(request.returnDate, i18n.language)}
            </dd>
          </div>
        </dl>
        {actions}
      </div>
    </article>
  );
}
