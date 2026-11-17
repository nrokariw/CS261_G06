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
import { CategoryBadge, StatusBadge } from "./UI";

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

  const content = (
    <div className="flex flex-col gap-5 pb-3">
      {loading ? (
        <div className="flex flex-col items-center justify-center text-center p-7 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-sm text-[var(--muted)]">
          <p className="m-0">{t("common.loading")}</p>
        </div>
      ) : errorStatus === 403 ? (
        <div
          className="flex flex-col items-center justify-center text-center p-7 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]"
          role="alert"
        >
          <span className="w-[54px] h-[54px] mb-3 rounded-full grid place-items-center bg-[#FCE8E4] text-[#B9382B] dark:bg-[#B9382B]/20 dark:text-[#FCA5A5]">
            <ShieldAlert size={28} />
          </span>
          <h3 className="m-0 mb-2 text-base font-semibold text-[var(--text)]">
            {t("evidenceTimeline.forbiddenTitle")}
          </h3>
          <p className="m-0 mb-4 text-[13px] text-[var(--muted)] max-w-md">
            {errorMessage || t("evidenceTimeline.forbiddenDesc")}
          </p>
          <Link to="/" className="button button-primary button-sm">
            <ArrowLeft size={15} /> {t("notFoundPage.backHome")}
          </Link>
        </div>
      ) : errorStatus ? (
        <div
          className="flex flex-col items-center justify-center text-center p-7 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]"
          role="alert"
        >
          <span className="w-[54px] h-[54px] mb-3 rounded-full grid place-items-center bg-[#FCE8E4] text-[#B9382B] dark:bg-[#B9382B]/20 dark:text-[#FCA5A5]">
            <ImageOff size={28} />
          </span>
          <h3 className="m-0 mb-2 text-base font-semibold text-[var(--text)]">
            {t("common.error")}
          </h3>
          <p className="m-0 text-[13px] text-[var(--muted)]">{errorMessage}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3.5 p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
            <div className="min-w-0 flex-1">
              <CategoryBadge category={data?.itemCategory} />
              <h3 className="mt-1.5 mb-2 text-base font-semibold text-[var(--text)]">
                {data?.itemTitle || data?.itemId}
              </h3>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={14} className="shrink-0" />{" "}
                  {t("evidenceTimeline.borrowedAt")}:{" "}
                  {formatDateTime(data?.borrowedAt, i18n.language)}
                </span>
                {data?.returnedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="shrink-0 text-[#247A4B] dark:text-[#4ADE80]" />{" "}
                    {t("evidenceTimeline.returnedAt")}:{" "}
                    {formatDateTime(data.returnedAt, i18n.language)}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">
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

          <div className="relative flex flex-col gap-4 pl-2 sm:pl-4 before:content-[''] before:absolute before:left-[23px] sm:before:left-[31px] before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--border)]">
            {/* Step 1: Handover Evidence */}
            <div className="relative flex gap-3.5 items-start">
              <div
                className={`relative z-10 w-8 h-8 rounded-full grid place-items-center shrink-0 border-2 ${
                  handoverProof
                    ? "bg-[#E4F3E8] border-[#247A4B] text-[#247A4B] dark:bg-[#1B3526] dark:border-[#4ADE80] dark:text-[#4ADE80]"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {handoverProof ? (
                  <PackageCheck size={16} />
                ) : (
                  <Clock size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0 p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                  <h4 className="m-0 text-sm font-semibold text-[var(--text)]">
                    {t("evidenceTimeline.handoverTitle")}
                  </h4>
                  {handoverProof?.capturedAt && (
                    <time className="text-[11.5px] text-[var(--muted)]">
                      {formatDateTime(handoverProof.capturedAt, i18n.language)}
                    </time>
                  )}
                </div>
                {handoverProof ? (
                  <div className="flex flex-col gap-2.5">
                    <a
                      href={handoverProof.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] max-h-[280px]"
                    >
                      <img
                        src={handoverProof.imageUrl}
                        alt={t("evidenceTimeline.handoverTitle")}
                        className="w-full max-h-[280px] object-contain block"
                      />
                    </a>
                    <p className="m-0 text-[13px] leading-relaxed text-[var(--text)] bg-[var(--surface-subtle)] px-3 py-2 rounded-lg">
                      <strong>{t("evidenceTimeline.noteLabel")}: </strong>
                      {handoverProof.note || t("evidenceTimeline.noNote")}
                    </p>
                  </div>
                ) : (
                  <p className="m-0 text-[13px] text-[var(--muted)]">
                    {t("evidenceTimeline.pendingHandoverDesc")}
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Return Evidence */}
            <div className="relative flex gap-3.5 items-start">
              <div
                className={`relative z-10 w-8 h-8 rounded-full grid place-items-center shrink-0 border-2 ${
                  returnProof
                    ? "bg-[#E4F3E8] border-[#247A4B] text-[#247A4B] dark:bg-[#1B3526] dark:border-[#4ADE80] dark:text-[#4ADE80]"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {returnProof ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Clock size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0 p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                  <h4 className="m-0 text-sm font-semibold text-[var(--text)]">
                    {t("evidenceTimeline.returnTitle")}
                  </h4>
                  {returnProof?.capturedAt && (
                    <time className="text-[11.5px] text-[var(--muted)]">
                      {formatDateTime(returnProof.capturedAt, i18n.language)}
                    </time>
                  )}
                </div>
                {returnProof ? (
                  <div className="flex flex-col gap-2.5">
                    <a
                      href={returnProof.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] max-h-[280px]"
                    >
                      <img
                        src={returnProof.imageUrl}
                        alt={t("evidenceTimeline.returnTitle")}
                        className="w-full max-h-[280px] object-contain block"
                      />
                    </a>
                    <p className="m-0 text-[13px] leading-relaxed text-[var(--text)] bg-[var(--surface-subtle)] px-3 py-2 rounded-lg">
                      <strong>{t("evidenceTimeline.noteLabel")}: </strong>
                      {returnProof.note || t("evidenceTimeline.noNote")}
                    </p>
                  </div>
                ) : (
                  <p className="m-0 text-[13px] text-[var(--muted)]">
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
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        <button
          type="button"
          className="back-link"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} /> {t("common.back")}
        </button>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="eyebrow">{t("evidenceTimeline.eyebrow")}</div>
          <h1 className="mt-1.5 mb-0 text-2xl sm:text-[26px] font-bold text-[var(--text)]">
            {t("evidenceTimeline.title")}
          </h1>
          <p className="mt-1 mb-5 text-[13px] text-[var(--muted)]">
            {t("evidenceTimeline.subtitle")}
          </p>
          {content}
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
          <div className="flex items-center gap-2 shrink-0">
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
