import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "lucide-react";
import { PageHeading, StatusBadge } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { BORROW_REASON_MAX_LENGTH } from "../constants/config";
import { getCategoryLabel, normalizeCategoryKey } from "../data";
import { createBorrowRequest, normalizeBorrowRequest } from "../api/requestsApi";
import { getItemById } from "../api/itemsApi";

export default function ItemDetails({ items, setRequests }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

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
    if (!reason.trim()) next.reason = t("validation.reasonRequired");
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      itemId: item.id,
      borrowerId: user?.studentId || user?.id,
      startDate: borrowDate.includes("T") ? borrowDate : `${borrowDate}T00:00:00`,
      endDate: returnDate.includes("T") ? returnDate : `${returnDate}T23:59:59`,
      reason: reason.trim(),
    };

    try {
      const apiResult = await createBorrowRequest(payload, token);
      const normalized = normalizeBorrowRequest(apiResult, items || [item]);
      if (setRequests) {
        setRequests((prev) => [
          {
            id: normalized?.id || apiResult?.id || crypto.randomUUID(),
            itemId: item.id,
            itemName: item.name,
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
      setSuccess(true);
      setTimeout(() => navigate("/my-borrows"), 1500);
    } catch (err) {
      setSubmitError(err.message || t("validation.submitFailed"));
    }
  }

  if(loading) return <div className="page-stack">กำลังโหลดข้อมูล...</div>

  if (errorMsg || !item)
    return (
      <div className="not-found">
        <h1>{t("itemDetails.notFoundTitle")}</h1>
        <Link className="button button-primary" to="/">
          {t("itemDetails.backToHome")}
        </Link>
      </div>
    );

  const categoryKey = normalizeCategoryKey(item.category);
  const categoryLabel = t(`categories.${categoryKey}`, {
    defaultValue: getCategoryLabel(item.category),
  });

  const isOwner = Boolean(
    (user?.studentId && item.ownerId === user.studentId) ||
    (user?.id && item.ownerId === user.id) ||
    (user?.name && item.owner === user.name)
  );
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
            <StatusBadge status={item.status} />
            <span className="category-label">{categoryLabel}</span>
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
          {success ? (
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
            <div className="borrow-note" style={{ color: "var(--accent-strong, #3b82f6)", marginTop: "15px" }}>
              <ShieldCheck size={17} />
              <span>{t("itemDetails.cannotBorrowOwnItem", { defaultValue: "คุณเป็นเจ้าของสิ่งของชิ้นนี้ ไม่สามารถยืมของตัวเองได้" })}</span>
            </div>
          ) : !isAvailable ? (
            <div className="borrow-note" style={{ color: "var(--danger, #ef4444)", marginTop: "15px" }}>
              <AlertCircle size={17} />
              <span>{t("itemDetails.itemNotAvailable", { defaultValue: "สิ่งของชิ้นนี้ไม่อยู่ในสถานะพร้อมให้ยืม (อาจถูกจองหรือยืมไปแล้ว)" })}</span>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="borrowDate">
                  {t("itemDetails.borrowDateLabel")} <span className="required">*</span>
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
                  {t("itemDetails.returnDateLabel")} <span className="required">*</span>
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
                <small className="field-error" style={{ marginBottom: "12px" }}>
                  <AlertCircle size={13} />
                  {submitError}
                </small>
              )}
              <button
                className="button button-primary button-full"
                type="submit"
              >
                <Send size={16} /> {t("itemDetails.submitRequest")}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
