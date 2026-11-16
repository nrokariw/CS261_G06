import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar, CheckCircle2 } from "lucide-react";
import { CATEGORIES, getCategoryLabel } from "../data";
import { PageHeading } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { ITEM_DETAIL_MAX_LENGTH, REDIRECT_DELAY_MS } from "../constants/config";
import {
  createWantedPost,
  getWantedPost,
  updateWantedPost,
} from "../api/wantedPostsApi";

function toDateInputValue(isoString) {
  if (!isoString) return "";
  return String(isoString).slice(0, 10);
}

function toLocalDateTimePayload(dateValue, isEndOfDay = false) {
  if (!dateValue) return null;
  return `${dateValue}T${isEndOfDay ? "23:59:59" : "00:00:00"}`;
}

export default function WantedPostCreate() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(
    CATEGORIES.find((c) => c !== "ALL") || "Electronics"
  );
  const [description, setDescription] = useState("");
  const [neededFrom, setNeededFrom] = useState("");
  const [neededUntil, setNeededUntil] = useState("");

  const [loadingPost, setLoadingPost] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!editId || !token) {
      setLoadingPost(false);
      return;
    }

    let cancelled = false;
    setLoadingPost(true);
    getWantedPost(editId, token)
      .then((post) => {
        if (cancelled) return;
        setTitle(post.title || "");
        setCategory(
          post.category || CATEGORIES.find((c) => c !== "ALL") || "Electronics"
        );
        setDescription(post.description || "");
        setNeededFrom(toDateInputValue(post.neededFrom));
        setNeededUntil(toDateInputValue(post.neededUntil));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || t("wanted.loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPost(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editId, token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t("wanted.titleRequired"));
      return;
    }

    if (neededFrom && neededUntil && neededUntil < neededFrom) {
      setError(t("wanted.dateRangeInvalid"));
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      description: description.trim() || null,
      neededFrom: toLocalDateTimePayload(neededFrom, false),
      neededUntil: toLocalDateTimePayload(neededUntil, true),
    };

    setSubmitting(true);
    try {
      const saved = isEditMode
        ? await updateWantedPost(editId, payload, token)
        : await createWantedPost(payload, token);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/wanted/${saved.id}`);
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      setError(err.message || t("wanted.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectableCategories = CATEGORIES.filter((c) => c !== "ALL");

  return (
    <div className="page-stack">
      <div className="back-link-row">
        <Link to="/?tab=wanted" className="button button-outline button-sm">
          <ArrowLeft size={16} /> {t("wanted.backToList")}
        </Link>
      </div>

      <PageHeading
        eyebrow={t("wanted.eyebrow")}
        title={isEditMode ? t("wanted.editTitle") : t("wanted.createTitle")}
        subtitle={t("wanted.createSubtitle")}
      />

      {loadingPost ? (
        <div className="card form-card">
          <p>{t("common.loading")}</p>
        </div>
      ) : (
        <form className="card form-card" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {success && (
            <div className="alert alert-success">
              <CheckCircle2 size={18} />{" "}
              {isEditMode ? t("wanted.updateSuccess") : t("wanted.createSuccess")}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="wanted-title">{t("wanted.fieldTitle")}</label>
            <input
              id="wanted-title"
              type="text"
              className="input"
              maxLength={120}
              placeholder={t("wanted.fieldTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wanted-category">{t("wanted.fieldCategory")}</label>
            <select
              id="wanted-category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {selectableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`, { defaultValue: getCategoryLabel(cat) })}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="wanted-from">
                <Calendar size={14} /> {t("wanted.fieldNeededFrom")}
              </label>
              <input
                id="wanted-from"
                type="date"
                className="input"
                value={neededFrom}
                onChange={(e) => setNeededFrom(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="wanted-until">
                <Calendar size={14} /> {t("wanted.fieldNeededUntil")}
              </label>
              <input
                id="wanted-until"
                type="date"
                className="input"
                value={neededUntil}
                min={neededFrom || undefined}
                onChange={(e) => setNeededUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="wanted-description">
              {t("wanted.fieldDescription")}
            </label>
            <textarea
              id="wanted-description"
              className="input"
              rows={4}
              maxLength={ITEM_DETAIL_MAX_LENGTH}
              placeholder={t("wanted.fieldDescriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <span className="field-hint">
              {description.length}/{ITEM_DETAIL_MAX_LENGTH}
            </span>
          </div>

          <div className="form-actions">
            <Link to="/?tab=wanted" className="button button-outline">
              {t("common.cancel")}
            </Link>
            <button
              type="submit"
              className="button button-primary"
              disabled={submitting || success}
            >
              {submitting
                ? t("common.saving")
                : isEditMode
                ? t("wanted.saveChanges")
                : t("wanted.submitCreate")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
