import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { submitReturnEvidence } from "../api/transactionsApi";
import EvidenceModal from "./EvidenceModal";

export default function ReturnModal({ request, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { user, token } = useAuth();

  async function handleSubmit(form, trimmedNote) {
    const authToken = token || user?.token;
    const tx = await submitReturnEvidence(request.id, form, authToken);
    onSuccess({
      transactionId: tx?.id,
      note: trimmedNote,
      returnedAt: tx?.returnedAt || new Date().toISOString(),
    });
  }

  return (
    <EvidenceModal
      request={request}
      onClose={onClose}
      onSubmitEvidence={handleSubmit}
      titleId="return-title"
      inputId="return-image"
      noteInputId="return-note"
      errorId="err-return-image"
      labels={{
        title: t("returnEvidence.title"),
        photoLabel: t("returnEvidence.photoLabel"),
        noteLabel: t("returnEvidence.noteLabel"),
        notePlaceholder: t("returnEvidence.notePlaceholder"),
        imageRequired: t("returnEvidence.imageRequired"),
        confirm: t("returnEvidence.confirm"),
        saving: t("returnEvidence.saving"),
        close: t("returnEvidence.close"),
      }}
    />
  );
}
