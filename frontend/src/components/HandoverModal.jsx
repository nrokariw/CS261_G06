// T-6.3: โมดอล "บันทึกหลักฐานการส่งมอบ (Handover Evidence)"
// ใช้ได้ทั้งฝั่งผู้ให้ยืม (IncomingRequests) และผู้ยืม (MyBorrows) กับคำขอสถานะ accepted
//
// เรียก API แบบ Atomic ผ่าน api/transactionsApi.js:
//   submitHandoverEvidence(requestId, formData, token) → POST /api/transactions/{requestId}/handover-evidence
//   ส่งเป็น multipart/form-data: imageFile (ไฟล์รูป), note (หมายเหตุสภาพของ)
import React, { useEffect, useRef, useState } from "react";
import {
  X,
  ImagePlus,
  UploadCloud,
  Trash2,
  AlertCircle,
  PackageCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from "../constants/config";
import { submitHandoverEvidence } from "../api/transactionsApi";

const NOTE_MAX = 300;
const FOCUSABLE =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

// รายการนี้ส่งมอบแล้วหรือยัง: เพิ่งบันทึกในหน้านี้ (req.handover) หรือโหลดมาจาก backend
// ที่สิ่งของเป็น borrowed แล้ว (ระบบอนุญาตให้ยืมได้เฉพาะสิ่งของที่ available จึงมีคำขอ accepted ที่ active ได้ทีละ 1)
export function isHandedOver(req, item) {
  return Boolean(
    req?.handover || (req?.status === "accepted" && item?.status === "borrowed"),
  );
}

function formatDate(date, language) {
  if (!date) return "—";
  const locale = language.startsWith("en") ? "en-US" : "th-TH";
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// request = คำขอยืม (status accepted)
// onClose() = ปิดโดยไม่บันทึก, onSuccess(handover) = บันทึกสำเร็จ (ให้หน้าเรียกอัปเดต state)
export default function HandoverModal({ request, onClose, onSuccess }) {
  const { t, i18n } = useTranslation();
  const { user, token } = useAuth();
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  const [imageError, setImageError] = useState("");
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef(null);
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);
  submittingRef.current = submitting;

  // โฟกัสเข้าโมดอล, ล็อกการเลื่อนหน้า, ปิดด้วย Esc, วน Tab ในโมดอล, คืนโฟกัสเมื่อปิด
  useEffect(() => {
    const previous = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape" && !submittingRef.current) {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const nodes = dialogRef.current.querySelectorAll(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previous && previous.focus) previous.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // คืนหน่วยความจำของ preview URL เมื่อเปลี่ยนรูปหรือปิดโมดอล
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function chooseImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError(t("validation.invalidImageType"));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError(t("validation.imageTooLarge", { max: MAX_IMAGE_SIZE_MB }));
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setImageError("");
  }

  function removeImage() {
    setImageFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;

    // Client-side validation: ต้องแนบรูปภาพก่อนกดยืนยัน
    if (!imageFile) {
      setImageError(t("handover.imageRequired"));
      return;
    }
    setImageError("");
    setApiError("");
    setSubmitting(true);

    const authToken = token || user?.token;
    const trimmedNote = note.trim();
    try {
      const form = new FormData();
      form.append("imageFile", imageFile);
      form.append("note", trimmedNote);
      const tx = await submitHandoverEvidence(request.id, form, authToken);

      onSuccess({
        transactionId: tx?.id,
        note: trimmedNote,
        capturedAt: tx?.borrowedAt || new Date().toISOString(),
      });
    } catch (err) {
      setApiError(err?.data?.message || err?.message || t("validation.submitFailed"));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="handover-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="modal-header">
          <div>
            <h2 id="handover-title">{t("handover.title")}</h2>
            <p>
              {request.itemName} · {t("handover.borrower")} {request.borrower}
              <br />
              {t("handover.period")} {formatDate(request.borrowDate, i18n.language)} -{" "}
              {formatDate(request.returnDate, i18n.language)}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("handover.close")}
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="modal-body">
            <div className="field">
              <label htmlFor="handover-image">
                {t("handover.photoLabel")} <span className="required">*</span>
              </label>
              <input
                id="handover-image"
                ref={fileRef}
                type="file"
                accept=".jpg, .jpeg, .png, .webp"
                className="visually-hidden"
                onChange={chooseImage}
                aria-invalid={imageError ? "true" : "false"}
                aria-describedby={imageError ? "err-handover-image" : undefined}
              />
              <button
                type="button"
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
                disabled={submitting}
              >
                {preview ? (
                  <>
                    <img
                      className="upload-preview"
                      src={preview}
                      alt={t("handover.previewAlt")}
                    />
                    <span className="upload-change">
                      <UploadCloud size={15} /> {imageFile?.name || t("handover.changeImage")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="upload-icon">
                      <ImagePlus size={28} />
                    </span>
                    <strong>{t("handover.uploadPrompt")}</strong>
                    <span>{t("handover.uploadHint", { max: MAX_IMAGE_SIZE_MB })}</span>
                  </>
                )}
              </button>
              {preview && (
                <button
                  type="button"
                  className="button button-danger-outline button-sm"
                  onClick={removeImage}
                  disabled={submitting}
                >
                  <Trash2 size={15} /> {t("handover.removeImage")}
                </button>
              )}
              {imageError && (
                <small className="field-error" id="err-handover-image" role="alert">
                  {imageError}
                </small>
              )}
            </div>

            <div className="field">
              <div className="label-row">
                <label htmlFor="handover-note">{t("handover.noteLabel")}</label>
                <small className="character-count">
                  {note.length}/{NOTE_MAX}
                </small>
              </div>
              <textarea
                id="handover-note"
                value={note}
                maxLength={NOTE_MAX}
                rows={3}
                disabled={submitting}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("handover.notePlaceholder")}
              />
            </div>

            {apiError && (
              <div className="alert alert-error" role="alert">
                <AlertCircle size={16} /> {apiError}
              </div>
            )}
          </div>

          <footer className="modal-footer">
            <button
              type="button"
              className="button button-outline"
              onClick={onClose}
              disabled={submitting}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className="button button-primary" disabled={submitting}>
              <PackageCheck size={16} />
              {submitting ? t("handover.saving") : t("handover.confirm")}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
