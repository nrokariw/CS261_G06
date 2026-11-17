import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageOff,
  PackageCheck,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getLoanEvidence } from "../api/transactionsApi";
import { StatusBadge } from "./UI";
import { getCategoryLabel, normalizeCategoryKey } from "../data";

function formatDateTime(value, language = "th") {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const locale = language.startsWith("en") ? "en-US" : "th-TH";
  return parsed.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveProof(data, type) {
  const list = Array.isArray(data?.evidences) ? data.evidences : [];
  const matched = list.find(
    (item) => String(item.proofType || "").toUpperCase() === type,
  );
  if (matched) return matched;

  if (type === "HANDOVER" && data?.handoverImageUrl) {
    return {
      proofType: "HANDOVER",
      imageUrl: data.handoverImageUrl,
      note: data.handoverNote,
      capturedAt: data.handoverTimestamp,
    };
  }
  if (type === "RETURN" && data?.returnImageUrl) {
    return {
      proofType: "RETURN",
      imageUrl: data.returnImageUrl,
      note: data.returnNote,
      capturedAt: data.returnTimestamp,
    };
  }
  return null;
}

export default function LoanEvidenceTimelineModal({
  requestId: propRequestId,
  onClose,
  asPage = false,
}) {
  const { requestId: routeRequestId } = useParams();
  const targetRequestId = propRequestId || routeRequestId;
  const { user, token } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dialogRef = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (asPage) return undefined;
    const previous = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape" && typeof onClose === "function") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previous && previous.focus) previous.focus();
    };
  }, [asPage, onClose]);

  useEffect(() => {
    if (!targetRequestId) return;
    let active = true;
    const authToken = token || user?.token;
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage("");

    getLoanEvidence(targetRequestId, authToken)
      .then((res) => {
        if (!active) return;
        setData(res);
      })
      .catch((err) => {
        if (!active) return;
        setErrorStatus(err?.status || 500);
        setErrorMessage(err?.data?.message || err?.message || t("common.error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [targetRequestId, token, user?.token, t]);

  const handoverProof = resolveProof(data, "HANDOVER");
  const returnProof = resolveProof(data, "RETURN");
  const categoryKey = normalizeCategoryKey(data?.itemCategory);
  const categoryLabel = data?.itemCategory
    ? t(`categories.${categoryKey}`, {
        defaultValue: getCategoryLabel(data.itemCategory),
      })
    : "";

  const content = (
    <div className="evidence-timeline-content">
      {loading ? (
        <div className="evidence-state-box">
          <p>{t("common.loading")}</p>
        </div>
      ) : errorStatus === 403 ? (
        <div className="evidence-forbidden-card" role="alert">
          <span className="evidence-forbidden-icon">
            <ShieldAlert size={28} />
          </span>
          <h3>{t("evidenceTimeline.forbiddenTitle")}</h3>
          <p>{errorMessage || t("evidenceTimeline.forbiddenDesc")}</p>
          <div className="evidence-state-actions">
            <Link to="/" className="button button-primary button-sm">
              <ArrowLeft size={15} /> {t("notFoundPage.backHome")}
            </Link>
          </div>
        </div>
      ) : errorStatus ? (
        <div className="evidence-forbidden-card" role="alert">
          <span className="evidence-forbidden-icon">
            <ImageOff size={28} />
          </span>
          <h3>{t("common.error")}</h3>
          <p>{errorMessage}</p>
        </div>
      ) : (
        <>
          <div className="evidence-summary-card">
            <div className="evidence-summary-main">
              {categoryLabel && (
                <span className="category-label">{categoryLabel}</span>
              )}
              <h3>{data?.itemTitle || data?.itemId}</h3>
              <div className="evidence-summary-meta">
                <span>
                  <CalendarClock size={14} />{" "}
                  {t("evidenceTimeline.borrowedAt")}:{" "}
                  {formatDateTime(data?.borrowedAt, i18n.language)}
                </span>
                {data?.returnedAt && (
                  <span>
                    <CheckCircle2 size={14} />{" "}
                    {t("evidenceTimeline.returnedAt")}:{" "}
                    {formatDateTime(data.returnedAt, i18n.language)}
                  </span>
                )}
              </div>
            </div>
            <div className="evidence-summary-badges">
              <StatusBadge
                status={
                  data?.transactionStatus === "COMPLETED"
                    ? "returned"
                    : data?.transactionStatus === "ACTIVE"
                    ? "borrowed"
                    : data?.requestStatus
                }
              />
            </div>
          </div>

          <div className="evidence-timeline">
            {/* Step 1: Handover Evidence */}
            <div
              className={`evidence-step ${
                handoverProof ? "evidence-step-done" : "evidence-step-pending"
              }`}
            >
              <div className="evidence-step-marker">
                {handoverProof ? (
                  <PackageCheck size={16} />
                ) : (
                  <Clock size={16} />
                )}
              </div>
              <div className="evidence-step-body">
                <div className="evidence-step-header">
                  <h4>{t("evidenceTimeline.handoverTitle")}</h4>
                  {handoverProof?.capturedAt && (
                    <time>
                      {formatDateTime(handoverProof.capturedAt, i18n.language)}
                    </time>
                  )}
                </div>
                {handoverProof ? (
                  <div className="evidence-proof-box">
                    <a
                      href={handoverProof.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="evidence-photo-frame"
                    >
                      <img
                        src={handoverProof.imageUrl}
                        alt={t("evidenceTimeline.handoverTitle")}
                      />
                    </a>
                    <p className="evidence-note">
                      <strong>{t("evidenceTimeline.noteLabel")}: </strong>
                      {handoverProof.note || t("evidenceTimeline.noNote")}
                    </p>
                  </div>
                ) : (
                  <p className="evidence-pending-text">
                    {t("evidenceTimeline.pendingHandoverDesc")}
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Return Evidence */}
            <div
              className={`evidence-step ${
                returnProof ? "evidence-step-done" : "evidence-step-pending"
              }`}
            >
              <div className="evidence-step-marker">
                {returnProof ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Clock size={16} />
                )}
              </div>
              <div className="evidence-step-body">
                <div className="evidence-step-header">
                  <h4>{t("evidenceTimeline.returnTitle")}</h4>
                  {returnProof?.capturedAt && (
                    <time>
                      {formatDateTime(returnProof.capturedAt, i18n.language)}
                    </time>
                  )}
                </div>
                {returnProof ? (
                  <div className="evidence-proof-box">
                    <a
                      href={returnProof.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="evidence-photo-frame"
                    >
                      <img
                        src={returnProof.imageUrl}
                        alt={t("evidenceTimeline.returnTitle")}
                      />
                    </a>
                    <p className="evidence-note">
                      <strong>{t("evidenceTimeline.noteLabel")}: </strong>
                      {returnProof.note || t("evidenceTimeline.noNote")}
                    </p>
                  </div>
                ) : (
                  <p className="evidence-pending-text">
                    {t("evidenceTimeline.pendingReturnDesc")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (asPage) {
    return (
      <div className="page-stack narrow-page">
        <button
          type="button"
          className="back-link"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} /> {t("common.back")}
        </button>
        <div className="detail-main">
          <div className="detail-info">
            <div className="eyebrow">{t("evidenceTimeline.eyebrow")}</div>
            <h1>{t("evidenceTimeline.title")}</h1>
            <p className="evidence-page-subtitle">
              {t("evidenceTimeline.subtitle")}
            </p>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && typeof onClose === "function") {
          onClose();
        }
      }}
    >
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-timeline-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="modal-header">
          <div>
            <h2 id="evidence-timeline-title">{t("evidenceTimeline.title")}</h2>
            <p>{t("evidenceTimeline.subtitle")}</p>
          </div>
          <div className="evidence-modal-header-actions">
            <Link
              to={`/transactions/${targetRequestId}/evidence`}
              className="button button-outline button-sm"
              onClick={onClose}
            >
              <ExternalLink size={14} /> {t("evidenceTimeline.openFullPage")}
            </Link>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label={t("handover.close")}
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="modal-body">{content}</div>
      </div>
    </div>
  );
}
