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
import { PageHeading, StatusBadge, CategoryBadge } from "../components/UI";
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

  if (loading) return <div className="page-stack">กำลังโหลดข้อมูล...</div>;

  if (errorMsg || !item)
    return (
      <div className="not-found">
        <h1>{t("itemDetails.notFoundTitle")}</h1>
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
    <div className="page-stack">
      <div className="detail-page-heading">
        <div className="eyebrow">{t("itemDetails.eyebrow")}</div>
      </div>
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> {t("itemDetails.backToSearch")}
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
          {Array.isArray(item.images) && item.images.length > 1 && (
            <div className="detail-thumbnails">
              {item.images.map((imgSrc, idx) => (
                <img key={idx} src={imgSrc} alt={`${item.name} ${idx + 1}`} />
              ))}
            </div>
          )}
          <div className="detail-info">
            <StatusBadge status={effectiveStatus} />
            <CategoryBadge category={item.category} />
            <h1>{item.name}</h1>
            <div className="owner-row">
              <span className="owner-avatar">
                <UserRound size={20} />
              </span>
              <div>
                <strong>{item.owner}</strong>
                <small>{t("itemDetails.ownerRole")}</small>
              </div>
              <span className="verified">
                <ShieldCheck size={15} /> {t("itemDetails.verifiedMember")}
              </span>
            </div>
            <hr />
            <h2>{t("itemDetails.detailHeading")}</h2>
            <p>{item.detail}</p>
            <div className="detail-meta">
              <span>
                <MapPin size={16} /> {t("itemDetails.pickupLocation")}
              </span>
              <span>
                <ShieldCheck size={16} /> {t("itemDetails.careNotice")}
              </span>
            </div>
            {availFromStr && (
              <div className="detail-availability">
                <CalendarDays size={16} />
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
        <aside className="borrow-panel">
          <div className="borrow-panel-heading">
            <span className="panel-icon">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2>{t("itemDetails.borrowHeading")}</h2>
              <p>{t("itemDetails.borrowSubtitle")}</p>
            </div>
          </div>
          {!user ? (
            <div style={{ marginTop: "15px", display: "grid", gap: "12px" }}>
              <div className="borrow-note">
                <ShieldCheck size={17} />
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
            <div className="request-success">
              <span>
                <CheckCircle2 size={28} />
              </span>
              <h3>{t("itemDetails.requestSentTitle", { defaultValue: "ส่งคำขอเรียบร้อยแล้ว!" })}</h3>
              <p>{t("itemDetails.requestSentDesc", { defaultValue: "เจ้าของสิ่งของจะตรวจสอบคำขอของคุณ" })}</p>
              <button
                className="button button-primary button-full"
                onClick={() => navigate("/my-borrows")}
              >
                {t("itemDetails.viewMyBorrows", { defaultValue: "ดูรายการยืมของฉัน" })}
              </button>
            </div>
          ) : isOwner ? (
            <div className="borrow-note borrow-note-info">
              <ShieldCheck size={17} />
              <span>{t("itemDetails.cannotBorrowOwnItem", { defaultValue: "คุณเป็นเจ้าของสิ่งของชิ้นนี้ ไม่สามารถยืมของตัวเองได้" })}</span>
            </div>
          ) : myRequest?.status === "rejected" ? (
            <div className="borrow-note borrow-note-rejected">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
                <AlertCircle size={18} />
                <span>{t("itemDetails.borrowBlockedTitle")}</span>
              </div>
              <p className="borrow-note-desc">
                {t("itemDetails.borrowBlockedDesc")}
              </p>
              {myRequest.responseReason && (
                <div className="borrow-note-reason">
                  {t("itemDetails.ownerNotePrefix")} {myRequest.responseReason}
                </div>
              )}
              <button
                type="button"
                className="button button-outline button-full"
                onClick={() => navigate("/my-borrows")}
              >
                {t("itemDetails.viewMyBorrows")}
              </button>
            </div>
          ) : myRequest && (myRequest.status === "pending" || myRequest.status === "accepted") ? (
            <div className="request-success" style={{ marginTop: "15px" }}>
              <span>
                <CheckCircle2 size={28} />
              </span>
              <h3>
                {myRequest.status === "accepted"
                  ? t("itemDetails.requestAcceptedTitle", { defaultValue: "คำขอของคุณได้รับการอนุมัติแล้ว" })
                  : t("itemDetails.requestPendingTitle", { defaultValue: "คุณได้ส่งคำขอยืมสิ่งของนี้แล้ว" })}
              </h3>
              <p>
                {myRequest.status === "accepted"
                  ? t("itemDetails.requestAcceptedDesc", { defaultValue: "กรุณานัดหมายเพื่อรับสิ่งของตามกำหนด" })
                  : t("itemDetails.requestPendingDesc", { defaultValue: "คำขอของคุณอยู่ระหว่างรอเจ้าของสิ่งของตรวจสอบ" })}
              </p>
              <div style={{ margin: "10px 0" }}>
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
            <div className="borrow-note borrow-note-danger">
              <AlertCircle size={17} />
              <span>{t("itemDetails.itemNotAvailable", { defaultValue: "สิ่งของชิ้นนี้ไม่อยู่ในสถานะพร้อมให้ยืม (อาจถูกจองหรือยืมไปแล้ว)" })}</span>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              {myRequest?.status === "change_requested" && (
                <div className="borrow-note-change">
                  <strong>{t("itemDetails.requestChangeTitle")}</strong>
                  <p>{t("itemDetails.requestChangeDesc")}</p>
                  {myRequest.responseReason && (
                    <div className="borrow-note-reason">
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
              <div className="borrow-note">
                <ShieldCheck size={17} />
                <span>{t("itemDetails.borrowNote")}</span>
              </div>
              {submitError && (
                <div className="alert alert-error" style={{ marginBottom: "12px" }}>
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
