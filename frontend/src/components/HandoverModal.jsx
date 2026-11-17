// T-6.3: โมดอล "บันทึกหลักฐานการส่งมอบ (Handover Evidence)"
// ใช้ได้ทั้งฝั่งผู้ให้ยืม (IncomingRequests) และผู้ยืม (MyBorrows) กับคำขอสถานะ accepted
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { submitHandoverEvidence } from "../api/transactionsApi";
import EvidenceModal from "./EvidenceModal";

export function isReturned(req) {
  return Boolean(
    req?.returned ||
      String(req?.transactionStatus || "").toLowerCase() === "completed",
  );
}

export function isHandedOver(req, item) {
  if (isReturned(req)) return false;
  return Boolean(
    req?.handover || (req?.status === "accepted" && item?.status === "borrowed"),
  );
}

export default function HandoverModal({ request, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { user, token } = useAuth();

  async function handleSubmit(form, trimmedNote) {
    const authToken = token || user?.token;
    const tx = await submitHandoverEvidence(request.id, form, authToken);
    onSuccess({
      transactionId: tx?.id,
      note: trimmedNote,
      capturedAt: tx?.borrowedAt || new Date().toISOString(),
    });
  }

  return (
    <EvidenceModal
      request={request}
      onClose={onClose}
      onSubmitEvidence={handleSubmit}
      titleId="handover-title"
      inputId="handover-image"
      noteInputId="handover-note"
      errorId="err-handover-image"
      labels={{
        title: t("handover.title"),
        photoLabel: t("handover.photoLabel"),
        noteLabel: t("handover.noteLabel"),
        notePlaceholder: t("handover.notePlaceholder"),
        imageRequired: t("handover.imageRequired"),
        confirm: t("handover.confirm"),
        saving: t("handover.saving"),
        close: t("handover.close"),
      }}
    />
  );
}
