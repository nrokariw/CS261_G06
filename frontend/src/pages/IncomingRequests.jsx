import React, { useState } from "react";
import { Check, X, AlertCircle, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import {
  updateBorrowRequestStatus,
  cancelBorrowRequest,
  respondToBorrowRequest,
} from "../api/requestsApi";

function formatDate(date, language = "th") {
  if (!date) return "—";
  const locale = language.startsWith("en") ? "en-US" : "th-TH";
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function IncomingRequests({ requests = [], setRequests, setItems, items = [] }) {
  const { user, token } = useAuth();
  const { t, i18n } = useTranslation();
  const [actionError, setActionError] = useState("");
  const [activeResponseReq, setActiveResponseReq] = useState(null);
  const [responseReason, setResponseReason] = useState("");
  const [modalError, setModalError] = useState("");

  const checkIsItemOwner = (req) => {
    const matchedItem = (items || []).find((i) => String(i.id) === String(req.itemId));
    const ownerId = req.ownerId || matchedItem?.ownerId;
    const ownerName = req.owner || matchedItem?.owner;
    return Boolean(
      (user?.studentId && String(ownerId) === String(user.studentId)) ||
      (user?.id && String(ownerId) === String(user.id)) ||
      (user?.name && ownerName === user.name)
    );
  };

  const isItemReservedByOther = (req) => {
    return requests.some(
      (r) =>
        r.id !== req.id &&
        String(r.itemId) === String(req.itemId) &&
        r.status === "accepted"
    );
  };

  const myIncomingRequests = requests.filter((r) => checkIsItemOwner(r));
  const pending = myIncomingRequests.filter((r) => r.status === "pending").length;
  const accepted = myIncomingRequests.filter((r) => r.status === "accepted").length;

  async function updateStatus(id, status) {
    setActionError("");
    const authToken = token || user?.token;
    const ownerId = user?.studentId || user?.id;
    const targetReq = requests.find((r) => r.id === id);
    try {
      if (status === "cancelled") {
        await cancelBorrowRequest(id, authToken);
      } else {
        await updateBorrowRequestStatus(id, status, { ownerId }, authToken);
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      if (setItems && targetReq?.itemId) {
        const nextItemStatus =
          status === "accepted"
            ? "reserved"
            : status === "cancelled"
              ? "unavailable"
              : "available";
        setItems((prev) =>
          prev.map((item) =>
            item.id === targetReq.itemId
              ? { ...item, status: nextItemStatus }
              : item,
          ),
        );
      }
    } catch (err) {
      setActionError(err.message || t("validation.submitFailed"));
    }
  }

  function openResponseModal(req) {
    setActiveResponseReq(req);
    setResponseReason("");
    setModalError("");
  }

  async function handleModalResponse(action) {
    if (action === "request_change" && !responseReason.trim()) {
      setModalError(t("validation.reasonRequired", { defaultValue: "กรุณาระบุเหตุผลในการขอให้แก้ไขข้อมูล" }));
      return;
    }
    setModalError("");
    const authToken = token || user?.token;
    try {
      await respondToBorrowRequest(activeResponseReq.id, action, responseReason.trim(), authToken);
      const nextStatus = action === "request_change" ? "change_requested" : "rejected";
      setRequests((prev) =>
        prev.map((r) =>
          r.id === activeResponseReq.id
            ? { ...r, status: nextStatus, responseReason: responseReason.trim() }
            : r,
        ),
      );
      if (setItems && activeResponseReq?.itemId) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === activeResponseReq.itemId
              ? { ...item, status: "available" }
              : item,
          ),
        );
      }
      setActiveResponseReq(null);
      setResponseReason("");
    } catch (err) {
      setModalError(err.message || t("validation.submitFailed"));
    }
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow={t("incomingRequests.eyebrow")}
        title={t("incomingRequests.title")}
        subtitle={t("incomingRequests.subtitle")}
        action={
          <div className="request-summary">
            <div className="request-summary-item">
              <small>{t("incomingRequests.totalRequests")}</small>
              <strong>{myIncomingRequests.length}</strong>
            </div>
            <div className="request-summary-item request-summary-pending">
              <small>{t("incomingRequests.pendingRequests")}</small>
              <strong>{pending}</strong>
            </div>
            <div className="request-summary-item request-summary-accepted">
              <small>{t("incomingRequests.acceptedRequests")}</small>
              <strong>{accepted}</strong>
            </div>
          </div>
        }
      />

      {actionError && (
        <div className="alert alert-error" style={{ background: "#FCE8E4", color: "#B9382B" }}>
          <AlertCircle size={17} />
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="alert-close">
            {t("myListings.closeAlert")}
          </button>
        </div>
      )}

      {myIncomingRequests.length ? (
        <div className="requests-list requests-list-updated">
          {myIncomingRequests.map((req) => (
            <article className="request-card request-card-updated" key={req.id}>
              <div className="request-main">
                <div className="request-card-top">
                  <Avatar name={req.borrower} />
                  <div className="request-title">
                    <h3>{req.itemName}</h3>
                    <p>
                      {t("incomingRequests.requestedBy")} <strong>{req.borrower}</strong>
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <p className="request-reason">{req.reason}</p>
                {req.responseReason && (
                  <p
                    className="request-response-note"
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--muted, #64748b)",
                      marginTop: "6px",
                      background: "var(--surface-muted, #f8fafc)",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      borderLeft: "3px solid #0284c7",
                    }}
                  >
                    <strong>{t("incomingRequests.ownerFeedbackLabel")}</strong>
                    {req.responseReason}
                  </p>
                )}
              </div>

              <div className="request-side">
                <dl className="request-dates">
                  <div>
                    <dt>{t("incomingRequests.borrowDate")}</dt>
                    <dd>{formatDate(req.borrowDate, i18n.language)}</dd>
                  </div>
                  <div>
                    <dt>{t("incomingRequests.returnDate")}</dt>
                    <dd>{formatDate(req.returnDate, i18n.language)}</dd>
                  </div>
                </dl>

                {checkIsItemOwner(req) && (
                  req.status === "pending" ? (
                    <div className="request-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="button button-primary"
                          disabled={isItemReservedByOther(req)}
                          title={isItemReservedByOther(req) ? t("incomingRequests.itemAlreadyReserved") : ""}
                          onClick={() => updateStatus(req.id, "accepted")}
                        >
                          <Check size={16} /> {t("incomingRequests.accept")}
                        </button>
                        <button
                          className="button button-danger-outline"
                          onClick={() => openResponseModal(req)}
                        >
                          <MessageSquare size={16} /> {t("incomingRequests.respond")}
                        </button>
                      </div>
                      {isItemReservedByOther(req) && (
                        <small style={{ color: "#b45309", fontSize: "0.8rem", marginTop: "4px" }}>
                          {t("incomingRequests.itemAlreadyReserved")}
                        </small>
                      )}
                    </div>
                  ) : (
                    <div className="request-status-updated">
                      <button
                        className="text-button"
                        onClick={() => updateStatus(req.id, "pending")}
                      >
                        {t("incomingRequests.resetToPending")}
                      </button>
                    </div>
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("incomingRequests.emptyTitle")}
          description={t("incomingRequests.emptyDesc")}
        />
      )}

      {activeResponseReq && (
        <div
          className="modal-overlay"
          onClick={() => setActiveResponseReq(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card-bg, #ffffff)",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{t("incomingRequests.responseModalTitle")}</h3>
              <button
                type="button"
                onClick={() => setActiveResponseReq(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem", marginBottom: "16px" }}>
              {t("incomingRequests.responseModalDesc")}
            </p>
            <div style={{ marginBottom: "16px", background: "var(--surface-muted, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
              <strong>{activeResponseReq.itemName}</strong>
              <div style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
                {t("incomingRequests.requestedBy")}: {activeResponseReq.borrower}
              </div>
            </div>
            <div className="field" style={{ marginBottom: "16px" }}>
              <label htmlFor="responseReason" style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
                {t("incomingRequests.reasonLabel")}
              </label>
              <textarea
                id="responseReason"
                rows={3}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border, #cbd5e1)", resize: "vertical" }}
                value={responseReason}
                onChange={(e) => setResponseReason(e.target.value)}
                placeholder={t("incomingRequests.reasonPlaceholder")}
              />
              {modalError && (
                <small className="field-error" style={{ color: "#ef4444", marginTop: "4px", display: "block" }}>
                  {modalError}
                </small>
              )}
            </div>
            <div className="modal-actions-grid">
              <button
                type="button"
                className="button button-outline"
                onClick={() => handleModalResponse("request_change")}
                style={{ borderColor: "#0284c7", color: "#0284c7" }}
              >
                {t("incomingRequests.requestChange")}
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => handleModalResponse("reject")}
              >
                {t("incomingRequests.permanentReject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
