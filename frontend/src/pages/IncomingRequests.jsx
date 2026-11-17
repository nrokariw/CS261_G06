import React, { useState } from "react";
import { Check, X, AlertCircle, PackageCheck, MessageSquare, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeading, EmptyState, RequestCard, AlertBanner } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import HandoverModal, { isHandedOver, isReturned } from "../components/HandoverModal";
import ReturnModal from "../components/ReturnModal";
import LoanEvidenceTimelineModal from "../components/LoanEvidenceTimelineModal";
import {
  updateBorrowRequestStatus,
  cancelBorrowRequest,
  respondToBorrowRequest,
} from "../api/requestsApi";

export default function IncomingRequests({ requests = [], setRequests, setItems, items = [] }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const [actionError, setActionError] = useState("");
  // T-6.3: คำขอที่กำลังเปิดโมดอลบันทึกหลักฐานการส่งมอบ + ข้อความแจ้งผลสำเร็จ
  const [handoverReq, setHandoverReq] = useState(null);
  const [evidenceRequestId, setEvidenceRequestId] = useState(null);
  const [returnReq, setReturnReq] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
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

  // T-6.3: บันทึกหลักฐานสำเร็จ 
  function handleHandoverSuccess(handover) {
    const target = handoverReq;
    setRequests((prev) =>
      prev.map((r) => (r.id === target.id ? { ...r, handover } : r)),
    );
    if (setItems) {
      setItems((prev) =>
        prev.map((i) => (i.id === target.itemId ? { ...i, status: "borrowed" } : i)),
      );
    }
    setHandoverReq(null);
    setActionError("");
    setSuccessMsg(t("handover.success", { name: target.itemName }));
  }

  // US-07.2: บันทึกหลักฐานการส่งคืนสำเร็จ → สถานะคำขอเป็น returned และสิ่งของกลับมา available
  function handleReturnSuccess(returned) {
    const target = returnReq;
    setRequests((prev) =>
      prev.map((r) => (r.id === target.id ? { ...r, returned } : r)),
    );
    if (setItems) {
      setItems((prev) =>
        prev.map((i) => (i.id === target.itemId ? { ...i, status: "available" } : i)),
      );
    }
    setReturnReq(null);
    setActionError("");
    setSuccessMsg(t("returnEvidence.success", { name: target.itemName }));
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
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t("incomingRequests.eyebrow")}
        title={t("incomingRequests.title")}
        subtitle={t("incomingRequests.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[var(--muted)]">{t("incomingRequests.totalRequests")}</small>
              <strong className="text-base font-bold text-[var(--text)]">{myIncomingRequests.length}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#FFF0C7]/70 dark:bg-[#3A2A14] border border-[#F5D782]/70 dark:border-[#5C4119] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[#8A5A08] dark:text-[#FBBF24]">{t("incomingRequests.pendingRequests")}</small>
              <strong className="text-base font-bold text-[#8A5A08] dark:text-[#FBBF24]">{pending}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#E4F3E8]/80 dark:bg-[#1B3526] border border-[#C3E6CB] dark:border-[#275238] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[#247A4B] dark:text-[#4ADE80]">{t("incomingRequests.acceptedRequests")}</small>
              <strong className="text-base font-bold text-[#247A4B] dark:text-[#4ADE80]">{accepted}</strong>
            </div>
          </div>
        }
      />

      <AlertBanner message={actionError} onClose={() => setActionError("")} />

      {successMsg && (
        <div className="alert alert-success" role="status">
          {successMsg}
          <button onClick={() => setSuccessMsg("")} className="alert-close">
            {t("myListings.closeAlert")}
          </button>
        </div>
      )}

      {myIncomingRequests.length ? (
        <div className="flex flex-col gap-4">
          {myIncomingRequests.map((req) => {
            // T-6.3 / US-07.2 / US-08.2: ส่งมอบแล้ว แสดง "กำลังยืม" / ส่งคืนแล้ว แสดง "คืนแล้ว"
            const matchedItem = items.find((i) => String(i.id) === String(req.itemId));
            const returned = isReturned(req);
            const handedOver = isHandedOver(req, matchedItem);
            const canViewEvidence = Boolean(
              handedOver ||
                returned ||
                (req?.status === "accepted" && matchedItem?.status === "available"),
            );
            return (
              <RequestCard
                key={req.id}
                request={req}
                role="owner"
                status={returned ? "returned" : handedOver ? "borrowed" : req.status}
                actions={
                  checkIsItemOwner(req) && (
                    req.status === "pending" ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            className="button button-primary button-sm"
                            disabled={isItemReservedByOther(req)}
                            title={isItemReservedByOther(req) ? t("incomingRequests.itemAlreadyReserved") : ""}
                            onClick={() => updateStatus(req.id, "accepted")}
                          >
                            <Check size={16} /> {t("incomingRequests.accept")}
                          </button>
                          <button
                            className="button button-danger-outline button-sm"
                            onClick={() => openResponseModal(req)}
                          >
                            <MessageSquare size={16} /> {t("incomingRequests.respond")}
                          </button>
                        </div>
                        {isItemReservedByOther(req) && (
                          <small className="text-[11px] font-medium text-[#8A5A08] dark:text-[#FBBF24] leading-snug">
                            {t("incomingRequests.itemAlreadyReserved")}
                          </small>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-stretch sm:items-end gap-2">
                        {returned ? (
                          <>
                            <small className="text-[13px] text-[var(--muted)] text-center sm:text-right">
                              {t("returnEvidence.done")}
                            </small>
                            <button
                              type="button"
                              className="button button-outline button-sm"
                              onClick={() => setEvidenceRequestId(req.id)}
                            >
                              <History size={15} /> {t("evidenceTimeline.button")}
                            </button>
                          </>
                        ) : handedOver ? (
                          <>
                            <small className="text-[13px] text-[var(--muted)] text-center sm:text-right">
                              {t("handover.done")}
                            </small>
                            <button
                              type="button"
                              className="button button-primary button-sm"
                              onClick={() => {
                                setSuccessMsg("");
                                setReturnReq(req);
                              }}
                            >
                              <PackageCheck size={16} /> {t("returnEvidence.button")}
                            </button>
                            <button
                              type="button"
                              className="button button-outline button-sm"
                              onClick={() => setEvidenceRequestId(req.id)}
                            >
                              <History size={15} /> {t("evidenceTimeline.button")}
                            </button>
                          </>
                        ) : canViewEvidence ? (
                          <button
                            type="button"
                            className="button button-outline button-sm"
                            onClick={() => setEvidenceRequestId(req.id)}
                          >
                            <History size={15} /> {t("evidenceTimeline.button")}
                          </button>
                        ) : (
                          <>
                            {/* T-6.3: ปุ่มบันทึกหลักฐานการส่งมอบ เฉพาะคำขอ accepted ที่ยังไม่ส่งมอบ */}
                            {req.status === "accepted" && (
                              <button
                                type="button"
                                className="button button-primary button-sm"
                                onClick={() => {
                                  setSuccessMsg("");
                                  setHandoverReq(req);
                                }}
                              >
                                <PackageCheck size={16} /> {t("handover.button")}
                              </button>
                            )}
                            <button
                              className="text-button"
                              onClick={() => updateStatus(req.id, "pending")}
                            >
                              {t("incomingRequests.resetToPending")}
                            </button>
                          </>
                        )}
                      </div>
                    )
                  )
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={t("incomingRequests.emptyTitle")}
          description={t("incomingRequests.emptyDesc")}
        />
      )}

      {/* T-6.3: โมดอลบันทึกหลักฐานการส่งมอบ */}
      {handoverReq && (
        <HandoverModal
          request={handoverReq}
          onClose={() => setHandoverReq(null)}
          onSuccess={handleHandoverSuccess}
        />
      )}

      {/* US-08.2: โมดอล Timeline ประวัติและหลักฐานการยืม-คืน */}
      {evidenceRequestId && (
        <LoanEvidenceTimelineModal
          requestId={evidenceRequestId}
          onClose={() => setEvidenceRequestId(null)}
        />
      )}

      {/* US-07.2: โมดอลบันทึกหลักฐานการส่งคืน */}
      {returnReq && (
        <ReturnModal
          request={returnReq}
          onClose={() => setReturnReq(null)}
          onSuccess={handleReturnSuccess}
        />
      )}

      {activeResponseReq && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveResponseReq(null)}
        >
          <div
            className="modal-card flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="m-0 text-lg font-semibold text-[var(--text)]">
                {t("incomingRequests.responseModalTitle")}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveResponseReq(null)}
                aria-label={t("common.close", { defaultValue: "ปิด" })}
              >
                <X size={20} />
              </button>
            </div>
            <p className="m-0 mb-4 text-[13px] leading-relaxed text-[var(--muted)]">
              {t("incomingRequests.responseModalDesc")}
            </p>
            <div className="mb-4 p-3.5 rounded-[10px] bg-[var(--surface-subtle)] border border-[var(--border)]">
              <strong className="block text-sm font-semibold text-[var(--text)]">
                {activeResponseReq.itemName}
              </strong>
              <div className="mt-1 text-xs text-[var(--muted)]">
                {t("incomingRequests.requestedBy")}: {activeResponseReq.borrower}
              </div>
            </div>
            <div className="field">
              <label htmlFor="responseReason">
                {t("incomingRequests.reasonLabel")}
              </label>
              <textarea
                id="responseReason"
                rows={3}
                value={responseReason}
                onChange={(e) => setResponseReason(e.target.value)}
                placeholder={t("incomingRequests.reasonPlaceholder")}
              />
              {modalError && (
                <small className="field-error">
                  <AlertCircle size={13} />
                  {modalError}
                </small>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                className="button button-outline button-info-outline"
                onClick={() => handleModalResponse("request_change")}
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