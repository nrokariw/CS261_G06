import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { BORROW_REASON_MAX_LENGTH } from "../constants/config";
import { getCategoryLabel, normalizeCategoryKey } from "../data";
import { createBorrowRequest } from "../api/requestsApi";

export default function ItemDetails({ items, setRequests }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const item = items.find((i) => i.id === id && i.status !== "deleted");
  const [borrowDate, setBorrowDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");

  async function submit(e) {
    e.preventDefault();
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
      startDate: borrowDate,
      endDate: returnDate,
      reason: reason.trim(),
    };
    const apiResult = await createBorrowRequest(payload, user?.token).catch(
      () => null,
    );

    setRequests((prev) => [
      {
        id: apiResult?.id || crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        borrower: user.name,
        borrowerId: user.id,
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
              <h3>{t("itemDetails.requestSentTitle")}</h3>
              <p>{t("itemDetails.requestSentDesc")}</p>
              <button
                className="button button-primary button-full"
                onClick={() => navigate("/my-listings")}
              >
                {t("itemDetails.backToListings")}
              </button>
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
