import React, { useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import {
  updateBorrowRequestStatus,
  cancelBorrowRequest,
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

  const checkIsItemOwner = (req) => {
    const matchedItem = (items || []).find((i) => i.id === req.itemId);
    const ownerId = req.ownerId || matchedItem?.ownerId;
    const ownerName = req.owner || matchedItem?.owner;
    return Boolean(
      (user?.studentId && ownerId === user.studentId) ||
      (user?.id && ownerId === user.id) ||
      (user?.name && ownerName === user.name)
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
                    <div className="request-actions">
                      <button
                        className="button button-primary"
                        onClick={() => updateStatus(req.id, "accepted")}
                      >
                        <Check size={16} /> {t("incomingRequests.accept")}
                      </button>
                      <button
                        className="button button-danger-outline"
                        onClick={() => updateStatus(req.id, "rejected")}
                      >
                        <X size={16} /> {t("incomingRequests.reject")}
                      </button>
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
    </div>
  );
}
