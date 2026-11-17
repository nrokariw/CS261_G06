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
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
} from "../constants/config";

const NOTE_MAX = 300;
const FOCUSABLE =
  'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function formatDate(date, language) {
  if (!date) return "—";
  const locale = language.startsWith("en") ? "en-US" : "th-TH";
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EvidenceModal({
  request,
  onClose,
  onSubmitEvidence,
  titleId,
  inputId,
  noteInputId,
  errorId,
  labels,
}) {
  const { t, i18n } = useTranslation();
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

    if (!imageFile) {
      setImageError(labels.imageRequired);
      return;
    }
    setImageError("");
    setApiError("");
    setSubmitting(true);

    const trimmedNote = note.trim();
    try {
      const form = new FormData();
      form.append("imageFile", imageFile);
      form.append("note", trimmedNote);
      await onSubmitEvidence(form, trimmedNote);
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
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{labels.title}</h2>
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
            aria-label={labels.close}
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="modal-body">
            <div className="field">
              <label htmlFor={inputId}>
                {labels.photoLabel} <span className="required">*</span>
              </label>
              <input
                id={inputId}
                ref={fileRef}
                type="file"
                accept=".jpg, .jpeg, .png, .webp"
                className="visually-hidden"
                onChange={chooseImage}
                aria-invalid={imageError ? "true" : "false"}
                aria-describedby={imageError ? errorId : undefined}
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
                  className="button button-danger-outline button-sm mt-2 self-start"
                  onClick={removeImage}
                  disabled={submitting}
                >
                  <Trash2 size={15} /> {t("handover.removeImage")}
                </button>
              )}
              {imageError && (
                <small className="field-error" id={errorId} role="alert">
                  {imageError}
                </small>
              )}
            </div>

            <div className="field">
              <div className="label-row">
                <label htmlFor={noteInputId}>{labels.noteLabel}</label>
                <small className="character-count">
                  {note.length}/{NOTE_MAX}
                </small>
              </div>
              <textarea
                id={noteInputId}
                value={note}
                maxLength={NOTE_MAX}
                rows={3}
                disabled={submitting}
                onChange={(e) => setNote(e.target.value)}
                placeholder={labels.notePlaceholder}
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
              {submitting ? labels.saving : labels.confirm}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
