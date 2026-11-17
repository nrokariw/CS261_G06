import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ShieldCheck,
  UserRound,
  Send,
  LogIn,
} from "lucide-react";
import { PageHeading, StatusBadge, CategoryBadge, Avatar } from "../components/UI";
import { isReturned } from "../components/HandoverModal";
import { useAuth } from "../contexts/AuthContext";
import { BORROW_REASON_MAX_LENGTH } from "../constants/config";
import { createBorrowRequest, normalizeBorrowRequest, resubmitBorrowRequest } from "../api/requestsApi";
import { getItemById } from "../api/itemsApi";

export default function ItemDetails({ items, requests = [], setRequests }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(""); 

  const [borrowDate, setBorrowDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true); 
        const data = await getItemById(id, token);
        setItem(data);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [id, token]);

  const availFromStr = item?.availableFrom ? String(item.availableFrom).slice(0, 10) : "";
  const availUntilStr = item?.availableUntil ? String(item.availableUntil).slice(0, 10) : "";

  const minBorrowDate = availFromStr && availFromStr > today ? availFromStr : today;
  const maxBorrowDate = availUntilStr || undefined;
  const minReturnDate = borrowDate || minBorrowDate;
  const maxReturnDate = availUntilStr || undefined;

  const myRequest = (requests || []).find((r) => {
    const matchesBorrower = Boolean(
      (user?.studentId && String(r.borrowerId) === String(user.studentId)) ||
      (user?.id && String(r.borrowerId) === String(user.id)) ||
      (user?.name && r.borrower === user.name)
    );
    if (!matchesBorrower) return false;
    if (isReturned(r) || r.status === "cancelled") return false;
    const matchesItem = String(r.itemId) === String(id || item?.id);
    return matchesItem;
  });

  useEffect(() => {
    if (myRequest && myRequest.status === "change_requested") {
      if (myRequest.borrowDate) setBorrowDate(myRequest.borrowDate);
      if (myRequest.returnDate) setReturnDate(myRequest.returnDate);
      if (myRequest.reason) setReason(myRequest.reason);
    }
  }, [myRequest]);

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    const next = {};
    if (!borrowDate) next.borrowDate = t("validation.borrowDateRequired");
    if (!returnDate) next.returnDate = t("validation.returnDateRequired");
    if (borrowDate && borrowDate < today)
      next.borrowDate = t("validation.borrowDatePast");
    if (borrowDate && returnDate && returnDate < borrowDate)
      next.returnDate = t("validation.returnDateBeforeBorrow");
    if (availFromStr && borrowDate && borrowDate < availFromStr) {
      next.borrowDate = t("validation.borrowDateBeforeAvail", {
        defaultValue: `วันที่ยืมต้องไม่ก่อน ${availFromStr}`,
      });
    }
    if (availUntilStr && returnDate && returnDate > availUntilStr) {
      next.returnDate = t("validation.returnDateAfterAvail", {
        defaultValue: `วันที่คืนต้องไม่เกิน ${availUntilStr}`,
      });
    }
    if (!reason.trim()) next.reason = t("validation.reasonRequired");
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      itemId: item.id,
      borrowerId: user?.studentId || user?.id,
      startDate: `${borrowDate}T00:00:00`,
      endDate: `${returnDate}T23:59:59`,
      reason: reason.trim(),
    };

    try {
      if (myRequest && myRequest.status === "change_requested") {
        await resubmitBorrowRequest(myRequest.id, payload, token);
        if (setRequests) {
          setRequests((prev) =>
            prev.map((r) =>
              r.id === myRequest.id
                ? {
                    ...r,
                    borrowDate,
                    returnDate,
                    reason: reason.trim(),
                    status: "pending",
                  }
                : r,
            ),
          );
        }
      } else {
        const apiResult = await createBorrowRequest(payload, token);
        const normalized = normalizeBorrowRequest(apiResult, items || [item]);
        if (setRequests) {
          setRequests((prev) => [
            {
              id: normalized?.id || apiResult?.id || crypto.randomUUID(),
              itemId: item.id,
              itemName: item.name,
              ownerId: normalized?.ownerId || item.ownerId || "",
              owner: normalized?.owner || item.owner || "",
              borrower: user?.name || payload.borrowerId,
              borrowerId: payload.borrowerId,
              borrowDate: normalized?.borrowDate || borrowDate,
              returnDate: normalized?.returnDate || returnDate,
              reason: normalized?.reason || reason.trim(),
              status: normalized?.status || "pending",
            },
            ...prev,
          ]);
        }
      }
      setSuccess(true);
      setTimeout(() => navigate("/my-borrows"), 1500);
    } catch (err) {
      setSubmitError(err.message || t("validation.submitFailed"));
    }
  }

  if (loading) return <div className="flex flex-col gap-6 text-sm text-[var(--muted)]">กำลังโหลดข้อมูล...</div>;

  if (errorMsg || !item)
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-4 max-w-lg mx-auto">
        <h1 className="m-0 text-2xl font-bold text-[var(--text)]">
          {t("itemDetails.notFoundTitle")}
        </h1>
        <Link className="button button-primary" to="/">
          {t("itemDetails.backToHome")}
        </Link>
      </div>
    );

  const isOwner = Boolean(
    (user?.studentId && item.ownerId === user.studentId) ||
    (user?.id && item.ownerId === user.id) ||
    (user?.name && item.owner === user.name)
  );

  const rawStatus = myRequest ? myRequest.status : item.status;
  const effectiveStatus =
    String(rawStatus || "").toLowerCase() === "accepted" ? "reserved" : rawStatus;
  const isAvailable = String(item.status || "").toLowerCase() === "available";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="eyebrow">{t("itemDetails.eyebrow")}</div>
      </div>
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> {t("itemDetails.backToSearch")}
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)] gap-7 items-start">
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="aspect-[16/10] bg-[var(--surface-subtle)] overflow-hidden">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-[var(--muted)] bg-[var(--surface-subtle)]">
                <CalendarDays size={48} />
              </div>
            )}
          </div>
          {Array.isArray(item.images) && item.images.length > 1 && (
            <div className="flex gap-2.5 px-6 pt-4 overflow-x-auto">
              {item.images.map((imgSrc, idx) => (
                <img
                  key={idx}
                  src={imgSrc}
                  alt={`${item.name} ${idx + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border border-[var(--border)] shrink-0"
                />
              ))}
            </div>
          )}
          <div className="p-6 sm:p-7 flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={effectiveStatus} />
              <CategoryBadge category={item.category} />
            </div>
            <h1 className="mt-3 mb-0 text-2xl sm:text-[26px] font-bold leading-snug text-[var(--text)]">
              {item.name}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
              <Avatar name={item.owner} size="md" />
              <div className="min-w-0 flex-1 flex flex-col">
                <strong className="text-sm font-semibold text-[var(--text)] truncate">
                  {item.owner}
                </strong>
                <small className="text-[11px] text-[var(--muted)]">
                  {t("itemDetails.ownerRole")}
                </small>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E4F3E8] text-[#247A4B] dark:bg-[#1B3526] dark:text-[#4ADE80] text-[11px] font-semibold shrink-0">
                <ShieldCheck size={14} /> {t("itemDetails.verifiedMember")}
              </span>
            </div>
            <hr className="my-5 border-0 border-t border-[var(--border)]" />
            <h2 className="m-0 text-[15px] font-semibold text-[var(--text)]">
              {t("itemDetails.detailHeading")}
            </h2>
            <p className="mt-2 mb-0 text-[13.5px] leading-relaxed text-[var(--muted)] whitespace-pre-line">
              {item.detail}
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} className="text-[var(--primary)] shrink-0" />{" "}
                {t("itemDetails.pickupLocation")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[var(--primary)] shrink-0" />{" "}
                {t("itemDetails.careNotice")}
              </span>
            </div>
            {availFromStr && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-tint)] border border-[var(--border)] text-xs font-medium text-[var(--text)] w-fit">
                <CalendarDays size={15} className="text-[var(--primary)] shrink-0" />
                <span>
                  {t("itemDetails.availablePeriod", {
                    from: availFromStr,
                    until: availUntilStr || t("common.noEndDate", { defaultValue: "ไม่มีกำหนด" }),
                  })}
                </span>
              </div>
            )}
          </div>
        </section>
        <aside className="lg:sticky lg:top-24 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-[var(--peach)] text-[var(--primary)] grid place-items-center shrink-0">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2 className="m-0 text-base font-semibold text-[var(--text)]">
                {t("itemDetails.borrowHeading")}
              </h2>
              <p className="m-0 mt-0.5 text-xs text-[var(--muted)] leading-snug">
                {t("itemDetails.borrowSubtitle")}
              </p>
            </div>
          </div>
          {!user ? (
            <div className="mt-2 grid gap-3">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs leading-relaxed text-[var(--muted)]">
                <ShieldCheck size={17} className="shrink-0 mt-0.5 text-[var(--primary)]" />
                <span>
                  {t("auth.loginRequiredToBorrow", {
                    defaultValue:
                      "กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษาก่อนส่งคำขอยืมสิ่งของชิ้นนี้",
                  })}
                </span>
              </div>
              <Link
                to="/login"
                state={{ from: location }}
                className="button button-primary button-full"
              >
                <LogIn size={16} />{" "}
                {t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}
              </Link>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center text-center gap-2.5 p-5 rounded-xl bg-[#E4F3E8]/60 dark:bg-[#1B3526]/70 border border-[#C3E6CB] dark:border-[#275238]">
              <span className="w-12 h-12 rounded-full bg-[#E4F3E8] text-[#247A4B] dark:bg-[#275238] dark:text-[#4ADE80] grid place-items-center">
                <CheckCircle2 size={26} />
              </span>
              <h3 className="m-0 text-base font-semibold text-[var(--text)]">
                {t("itemDetails.requestSentTitle", { defaultValue: "ส่งคำขอเรียบร้อยแล้ว!" })}
              </h3>
              <p className="m-0 text-xs text-[var(--muted)]">
                {t("itemDetails.requestSentDesc", { defaultValue: "เจ้าของสิ่งของจะตรวจสอบคำขอของคุณ" })}
              </p>
              <button
                className="button button-primary button-full mt-2"
                onClick={() => navigate("/my-borrows")}
              >
                {t("itemDetails.viewMyBorrows", { defaultValue: "ดูรายการยืมของฉัน" })}
              </button>
            </div>
          ) : isOwner ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#172E48] dark:text-[#7DD3FC] dark:border-[#1E466F] text-xs leading-relaxed">
              <ShieldCheck size={17} className="shrink-0 mt-0.5" />
              <span>{t("itemDetails.cannotBorrowOwnItem", { defaultValue: "คุณเป็นเจ้าของสิ่งของชิ้นนี้ ไม่สามารถยืมของตัวเองได้" })}</span>
            </div>
          ) : myRequest?.status === "rejected" ? (
            <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#FCE8E4] text-[#B9382B] border border-[#F5C2B8] dark:bg-[#3B1C18] dark:text-[#FCA5A5] dark:border-[#5C2720] text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle size={18} className="shrink-0" />
                <span>{t("itemDetails.borrowBlockedTitle")}</span>
              </div>
              <p className="m-0 opacity-90">
                {t("itemDetails.borrowBlockedDesc")}
              </p>
              {myRequest.responseReason && (
                <div className="px-3 py-2 rounded-lg bg-[var(--surface)]/80 border border-[var(--border)] text-[var(--text)]">
                  {t("itemDetails.ownerNotePrefix")} {myRequest.responseReason}
                </div>
              )}
              <button
                type="button"
                className="button button-outline button-full mt-1"
                onClick={() => navigate("/my-borrows")}
              >
                {t("itemDetails.viewMyBorrows")}
              </button>
            </div>
          ) : myRequest && (myRequest.status === "pending" || myRequest.status === "accepted") ? (
            <div className="mt-2 flex flex-col items-center text-center gap-2.5 p-5 rounded-xl bg-[#E4F3E8]/60 dark:bg-[#1B3526]/70 border border-[#C3E6CB] dark:border-[#275238]">
              <span className="w-12 h-12 rounded-full bg-[#E4F3E8] text-[#247A4B] dark:bg-[#275238] dark:text-[#4ADE80] grid place-items-center">
                <CheckCircle2 size={26} />
              </span>
              <h3 className="m-0 text-base font-semibold text-[var(--text)]">
                {myRequest.status === "accepted"
                  ? t("itemDetails.requestAcceptedTitle", { defaultValue: "คำขอของคุณได้รับการอนุมัติแล้ว" })
                  : t("itemDetails.requestPendingTitle", { defaultValue: "คุณได้ส่งคำขอยืมสิ่งของนี้แล้ว" })}
              </h3>
              <p className="m-0 text-xs text-[var(--muted)]">
                {myRequest.status === "accepted"
                  ? t("itemDetails.requestAcceptedDesc", { defaultValue: "กรุณานัดหมายเพื่อรับสิ่งของตามกำหนด" })
                  : t("itemDetails.requestPendingDesc", { defaultValue: "คำขอของคุณอยู่ระหว่างรอเจ้าของสิ่งของตรวจสอบ" })}
              </p>
              <div className="my-2">
                <StatusBadge status={myRequest.status} />
              </div>
              <button
                type="button"
                className="button button-primary button-full"
                onClick={() => navigate("/my-borrows")}
              >
                {t("itemDetails.viewMyBorrows", { defaultValue: "ดูรายการยืมของฉัน" })}
              </button>
            </div>
          ) : !isAvailable ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FCE8E4] text-[#B9382B] border border-[#F5C2B8] dark:bg-[#3B1C18] dark:text-[#F87171] dark:border-[#5C2720] text-xs leading-relaxed">
              <AlertCircle size={17} className="shrink-0 mt-0.5" />
              <span>{t("itemDetails.itemNotAvailable", { defaultValue: "สิ่งของชิ้นนี้ไม่อยู่ในสถานะพร้อมให้ยืม (อาจถูกจองหรือยืมไปแล้ว)" })}</span>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              {myRequest?.status === "change_requested" && (
                <div className="mb-4 flex flex-col gap-1.5 p-3.5 rounded-xl bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] dark:bg-[#172E48] dark:text-[#7DD3FC] dark:border-[#1E466F] text-xs leading-relaxed">
                  <strong>{t("itemDetails.requestChangeTitle")}</strong>
                  <p className="m-0">{t("itemDetails.requestChangeDesc")}</p>
                  {myRequest.responseReason && (
                    <div className="mt-1 px-3 py-2 rounded-lg bg-[var(--surface)]/80 border border-[var(--border)] text-[var(--text)]">
                      {t("itemDetails.ownerNotePrefix")} {myRequest.responseReason}
                    </div>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="borrowDate">
                  {t("itemDetails.borrowDateLabel")} <span className="required">*</span>
                </label>
                <input
                  id="borrowDate"
                  type="date"
                  min={minBorrowDate}
                  max={maxBorrowDate}
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
                  {t("itemDetails.returnDateLabel")} <span className="required">*</span>
                </label>
                <input
                  id="returnDate"
                  type="date"
                  min={minReturnDate}
                  max={maxReturnDate}
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
                  {t("itemDetails.reasonLabel")} <span className="required">*</span>
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  maxLength={BORROW_REASON_MAX_LENGTH}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("itemDetails.reasonPlaceholder")}
                  aria-invalid={!!errors.reason}
                />
                {errors.reason && (
                  <small className="field-error">{errors.reason}</small>
                )}
                <small className="helper-text">
                  {t("itemDetails.charCount", { count: reason.length, max: BORROW_REASON_MAX_LENGTH })}
                </small>
              </div>
              <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs leading-relaxed text-[var(--muted)]">
                <ShieldCheck size={17} className="shrink-0 mt-0.5 text-[var(--primary)]" />
                <span>{t("itemDetails.borrowNote")}</span>
              </div>
              {submitError && (
                <div className="alert alert-error mb-3">
                  <AlertCircle size={16} />
                  <span>{submitError}</span>
                </div>
              )}
              <button
                className="button button-primary button-full"
                type="submit"
              >
                <Send size={16} />{" "}
                {myRequest?.status === "change_requested"
                  ? t("itemDetails.resubmitRequest")
                  : t("itemDetails.submitRequest")}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
