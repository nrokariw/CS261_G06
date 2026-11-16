import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ImagePlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  HandHeart,
} from "lucide-react";
import {
  CATEGORIES,
  getCategoryLabel,
  normalizeCategoryKey,
} from "../data";
import { PageHeading } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { createItem, updateItem, normalizeItem } from "../api/itemsApi";
import {
  createWantedPost,
  getWantedPost,
  updateWantedPost,
} from "../api/wantedPostsApi";
import {
  ALLOWED_IMAGE_TYPES,
  ITEM_DETAIL_MAX_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  REDIRECT_DELAY_MS,
} from "../constants/config";

function toLocalDateTimePayload(dateValue, isEndOfDay = false) {
  if (!dateValue) return null;
  return `${dateValue}T${isEndOfDay ? "23:59:59" : "00:00:00"}`;
}

export default function CreateListing({ items = [], setItems, initialTab = "items" }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const activeTab =
    params.get("tab") === "wanted" || initialTab === "wanted"
      ? "wanted"
      : "items";
  const editId = params.get("edit");
  const editingItem = activeTab === "items" ? items.find((i) => i.id === editId) : null;

  const handleTabChange = (nextTab) => {
    const next = new URLSearchParams(params);
    next.delete("edit");
    if (nextTab === "wanted") next.set("tab", "wanted");
    else next.delete("tab");
    navigate(`/create${next.toString() ? `?${next.toString()}` : ""}`, {
      replace: true,
    });
  };
  const [name, setName] = useState(editingItem?.name || "");
  const [category, setCategory] = useState(
    normalizeCategoryKey(editingItem?.category) || "",
  );
  const [detail, setDetail] = useState(editingItem?.detail || "");
  const [availableFrom, setAvailableFrom] = useState(
    editingItem?.availableFrom ? String(editingItem.availableFrom).slice(0, 10) : "",
  );
  const [availableUntil, setAvailableUntil] = useState(
    editingItem?.availableUntil ? String(editingItem.availableUntil).slice(0, 10) : "",
  );
  const today = new Date().toLocaleDateString("en-CA");
  const minUntilDate = availableFrom && availableFrom > today ? availableFrom : today;
  
  // เปลี่ยนเก็บเป็น File Object แทน Base64 String
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(editingItem?.image || "");
  const [imageFileName, setImageFileName] = useState("");

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef(null);

  const [wantedTitle, setWantedTitle] = useState("");
  const [wantedCategory, setWantedCategory] = useState(
    CATEGORIES.find((c) => c !== "ALL") || "Electronics",
  );
  const [wantedDescription, setWantedDescription] = useState("");
  const [neededFrom, setNeededFrom] = useState("");
  const [neededUntil, setNeededUntil] = useState("");
  const [wantedLoading, setWantedLoading] = useState(false);
  const [wantedSubmitting, setWantedSubmitting] = useState(false);
  const [wantedErrors, setWantedErrors] = useState({});
  const [wantedSubmitError, setWantedSubmitError] = useState("");
  const [wantedSuccess, setWantedSuccess] = useState("");

  useEffect(() => {
    const authToken = token || user?.token;
    if (activeTab !== "wanted") return;
    if (!editId) {
      setWantedTitle("");
      setWantedCategory(CATEGORIES.find((c) => c !== "ALL") || "Electronics");
      setWantedDescription("");
      setNeededFrom("");
      setNeededUntil("");
      setWantedLoading(false);
      return;
    }
    if (!authToken) return;

    let cancelled = false;
    setWantedLoading(true);
    setWantedSubmitError("");
    getWantedPost(editId, authToken)
      .then((post) => {
        if (cancelled) return;
        setWantedTitle(post.title || "");
        setWantedCategory(
          normalizeCategoryKey(post.category) ||
            CATEGORIES.find((c) => c !== "ALL") ||
            "Electronics",
        );
        setWantedDescription(post.description || "");
        setNeededFrom(post.neededFrom ? String(post.neededFrom).slice(0, 10) : "");
        setNeededUntil(
          post.neededUntil ? String(post.neededUntil).slice(0, 10) : "",
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setWantedSubmitError(err.message || t("wanted.loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setWantedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, editId, token, user?.token, t]);

  function validate() {
    const next = {};
    if (!name.trim()) next.name = t("validation.itemNameRequired");
    if (!category) next.category = t("validation.categoryRequired");
    if (!detail.trim()) next.detail = t("validation.detailRequired");
    if (availableFrom && availableFrom < today) {
      next.availableFrom = t("validation.availableFromPast", {
        defaultValue: "วันเริ่มต้นเปิดให้ยืมต้องไม่เป็นวันในอดีต",
      });
    }
    if (availableUntil && availableUntil < today) {
      next.availableUntil = t("validation.availableUntilPast", {
        defaultValue: "วันสิ้นสุดการให้ยืมต้องไม่เป็นวันในอดีต",
      });
    } else if (availableFrom && availableUntil && availableUntil < availableFrom) {
      next.availableUntil = t("validation.returnDateBeforeBorrow", {
        defaultValue: "วันสิ้นสุดต้องไม่มาก่อนวันเริ่มต้น",
      });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function chooseImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. ตรวจสอบนามสกุลไฟล์ก่อนถึง backend (JPG, PNG, WEBP)
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ 
        ...prev, 
        image: t("validation.invalidImageType") 
      }));
      return;
    }

    // 2. ตรวจสอบขนาดไม่ให้เกินขีดจำกัดก่อนถึง backend 
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({ 
        ...prev, 
        image: t("validation.imageTooLarge", { max: MAX_IMAGE_SIZE_MB }) 
      }));
      return;
    }

    // เก็บ File Object จริงไว้เตรียมส่ง FormData
    setImageFile(file);
    setImageFileName(file.name);

    // สร้าง Preview สำหรับแสดงผลชั่วคราวบนหน้าจอ
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
    setErrors((prev) => ({ ...prev, image: "" }));
  }

  async function submit(e) {
    e.preventDefault();
    setSuccess("");
    setSubmitError("");
    if (!validate()) return;

    // ใช้ FormData สำหรับส่งไฟล์และข้อมูลไป Backend พร้อมกัน
    const formData = new FormData();

    // แมปชื่อจากฝั่ง Frontend ให้ตรงกับ DTO ฝั่ง Backend
    formData.append("title", name.trim());
    formData.append("category", category);
    formData.append("description", detail.trim());
    if (availableFrom) {
      formData.append("availableFrom", `${availableFrom}T00:00:00`);
    }
    if (availableUntil) {
      formData.append("availableUntil", `${availableUntil}T23:59:59`);
    }

    // แนบไฟล์จริงไปกับ Key ที่ Backend รอรับ 
    if (imageFile) {
      formData.append("imageFile", imageFile);
    }

    try {
      // ส่ง Request หรือ ยิง API ไปหา Backend
      const studentId = user?.studentId || user?.id;
      const authToken = token || user?.token;
      const result = editingItem
        ? await updateItem(
            editingItem.id,
            imageFile
              ? formData
              : {
                  title: name.trim(),
                  category,
                  description: detail.trim(),
                  availableFrom: availableFrom ? `${availableFrom}T00:00:00` : null,
                  availableUntil: availableUntil ? `${availableUntil}T23:59:59` : null,
                },
            authToken,
          )
        : await createItem(studentId, formData, authToken);
      const normalized = normalizeItem(result, editingItem?.owner || user?.name);

      // บันทึกลง State ฝั่ง frontend (อันเดิม)
      const record = {
        id: normalized?.id || editingItem?.id,
        name: normalized?.name || name.trim(),
        category: normalized?.category || category,
        detail: normalized?.detail || detail.trim(),
        image: normalized?.image || imagePreview || "",
        owner: editingItem?.owner || user?.name,
        ownerId:
          normalized?.ownerId ||
          editingItem?.ownerId ||
          studentId ||
          user?.id,
        status: normalized?.status || "available",
        availableFrom: normalized?.availableFrom || (availableFrom ? `${availableFrom}T00:00:00` : null),
        availableUntil: normalized?.availableUntil || (availableUntil ? `${availableUntil}T23:59:59` : null),
      };
      if (editingItem)
        setItems((prev) =>
          prev.map((item) => (item.id === editingItem.id ? record : item)),
        );
      else setItems((prev) => [record, ...prev]);
      setSuccess(
        editingItem ? t("validation.listingUpdated") : t("validation.listingCreated"),
      );
      window.setTimeout(() => navigate("/my-listings"), REDIRECT_DELAY_MS);
    } catch (err) {
      setErrors((prev) => ({ ...prev, submit: t("validation.submitFailed") }));
      setSubmitError(err.message || t("validation.submitFailed"));
    }
}

  async function submitWanted(e) {
    e.preventDefault();
    setWantedSuccess("");
    setWantedSubmitError("");

    const next = {};
    if (!wantedTitle.trim()) {
      next.title = t("wanted.titleRequired");
    }
    if (neededFrom && neededUntil && neededUntil < neededFrom) {
      next.neededUntil = t("wanted.dateRangeInvalid");
    }
    setWantedErrors(next);
    if (Object.keys(next).length > 0) return;

    const authToken = token || user?.token;
    const payload = {
      title: wantedTitle.trim(),
      category: wantedCategory,
      description: wantedDescription.trim() || null,
      neededFrom: toLocalDateTimePayload(neededFrom, false),
      neededUntil: toLocalDateTimePayload(neededUntil, true),
    };

    setWantedSubmitting(true);
    try {
      if (editId) {
        await updateWantedPost(editId, payload, authToken);
      } else {
        await createWantedPost(payload, authToken);
      }
      setWantedSuccess(
        editId ? t("wanted.updateSuccess") : t("wanted.createSuccess"),
      );
      window.setTimeout(
        () => navigate("/my-listings?tab=wanted"),
        REDIRECT_DELAY_MS,
      );
    } catch (err) {
      setWantedSubmitError(err.message || t("wanted.saveError"));
    } finally {
      setWantedSubmitting(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> {t("common.back")}
      </button>
      <PageHeading
        eyebrow={
          activeTab === "wanted"
            ? t("wanted.eyebrow")
            : editingItem
            ? t("createListing.eyebrowEdit")
            : t("createListing.eyebrowCreate")
        }
        title={
          activeTab === "wanted"
            ? editId
              ? t("wanted.editTitle")
              : t("wanted.createTitle")
            : editingItem
            ? t("createListing.titleEdit")
            : t("createListing.titleCreate")
        }
        subtitle={
          activeTab === "wanted"
            ? t("wanted.createSubtitle")
            : t("createListing.subtitle")
        }
      />
      <div className="tab-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "items"}
          className={`tab-btn ${activeTab === "items" ? "tab-btn-active" : ""}`}
          onClick={() => handleTabChange("items")}
        >
          {t("wanted.tabLendItems")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "wanted"}
          className={`tab-btn ${activeTab === "wanted" ? "tab-btn-active" : ""}`}
          onClick={() => handleTabChange("wanted")}
        >
          <HandHeart size={16} /> {t("wanted.tabWantedPosts")}
        </button>
      </div>
      {activeTab === "wanted" ? (
        wantedLoading ? (
          <div className="form-card">
            <p>{t("common.loading")}</p>
          </div>
        ) : (
          <form className="form-card" onSubmit={submitWanted} noValidate>
            {wantedSuccess && (
              <div className="alert alert-success">
                <CheckCircle2 size={18} />
                {wantedSuccess}
              </div>
            )}
            <div className="form-section-title">
              <span className="section-number">01</span>
              <div>
                <h2>{t("wanted.eyebrow")}</h2>
                <p>{t("wanted.createSubtitle")}</p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="wanted-title">
                {t("wanted.fieldTitle")} <span className="required">*</span>
              </label>
              <input
                id="wanted-title"
                maxLength={120}
                value={wantedTitle}
                onChange={(e) => setWantedTitle(e.target.value)}
                placeholder={t("wanted.fieldTitlePlaceholder")}
                aria-invalid={!!wantedErrors.title}
              />
              {wantedErrors.title && (
                <small className="field-error">
                  <AlertCircle size={13} />
                  {wantedErrors.title}
                </small>
              )}
            </div>
            <div className="field">
              <label htmlFor="wanted-category">
                {t("wanted.fieldCategory")} <span className="required">*</span>
              </label>
              <select
                id="wanted-category"
                value={wantedCategory}
                onChange={(e) => setWantedCategory(e.target.value)}
              >
                {CATEGORIES.filter((c) => c !== "ALL").map((c) => (
                  <option key={c} value={c}>
                    {t(`categories.${c}`, { defaultValue: getCategoryLabel(c) })}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <div className="label-row">
                <label htmlFor="wanted-description">
                  {t("wanted.fieldDescription")}
                </label>
                <span className="character-count">
                  {wantedDescription.length}/{ITEM_DETAIL_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="wanted-description"
                maxLength={ITEM_DETAIL_MAX_LENGTH}
                rows={4}
                value={wantedDescription}
                onChange={(e) => setWantedDescription(e.target.value)}
                placeholder={t("wanted.fieldDescriptionPlaceholder")}
              />
            </div>
            <div className="field-group two-col-responsive">
              <div className="field">
                <label htmlFor="wanted-from">{t("wanted.fieldNeededFrom")}</label>
                <input
                  id="wanted-from"
                  type="date"
                  value={neededFrom}
                  onChange={(e) => {
                    const nextFrom = e.target.value;
                    setNeededFrom(nextFrom);
                    if (neededUntil && nextFrom && neededUntil < nextFrom) {
                      setNeededUntil(nextFrom);
                    }
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="wanted-until">{t("wanted.fieldNeededUntil")}</label>
                <input
                  id="wanted-until"
                  type="date"
                  min={neededFrom || undefined}
                  value={neededUntil}
                  onChange={(e) => {
                    setNeededUntil(e.target.value);
                    if (wantedErrors.neededUntil) {
                      setWantedErrors((prev) => ({ ...prev, neededUntil: "" }));
                    }
                  }}
                  aria-invalid={!!wantedErrors.neededUntil}
                />
                {wantedErrors.neededUntil && (
                  <small className="field-error">
                    <AlertCircle size={13} />
                    {wantedErrors.neededUntil}
                  </small>
                )}
              </div>
            </div>
            {wantedSubmitError && (
              <div
                className="alert alert-error"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px",
                  padding: "12px",
                  background: "#ffebee",
                  color: "#c62828",
                  borderRadius: "6px",
                }}
              >
                <AlertCircle size={18} />
                <span>{wantedSubmitError}</span>
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => navigate(-1)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={wantedSubmitting || Boolean(wantedSuccess)}
              >
                <CheckCircle2 size={17} />
                {wantedSubmitting
                  ? t("common.saving")
                  : editId
                  ? t("wanted.saveChanges")
                  : t("wanted.submitCreate")}
              </button>
            </div>
          </form>
        )
      ) : (
      <form className="form-card" onSubmit={submit} noValidate>
        {success && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}
        <div className="form-section-title">
          <span className="section-number">01</span>
          <div>
            <h2>{t("createListing.section1Title")}</h2>
            <p>{t("createListing.section1Desc")}</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="item-name">
            {t("createListing.nameLabel")} <span className="required">*</span>
          </label>
          <input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("createListing.namePlaceholder")}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <small className="field-error">
              <AlertCircle size={13} />
              {errors.name}
            </small>
          )}
        </div>
        <div className="field">
          <label htmlFor="item-category">
            {t("createListing.categoryLabel")} <span className="required">*</span>
          </label>
          <select
            id="item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-invalid={!!errors.category}
          >
            <option value="">{t("createListing.categoryPlaceholder")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`, { defaultValue: getCategoryLabel(c) })}
              </option>
            ))}
          </select>
          {errors.category && (
            <small className="field-error">
              <AlertCircle size={13} />
              {errors.category}
            </small>
          )}
        </div>
        <div className="field">
          <div className="label-row">
            <label htmlFor="item-detail">
              {t("createListing.detailLabel")} <span className="required">*</span>
            </label>
            <span className="character-count">{detail.length}/{ITEM_DETAIL_MAX_LENGTH}</span>
          </div>
          <textarea
            id="item-detail"
            maxLength={ITEM_DETAIL_MAX_LENGTH}
            rows={5}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={t("createListing.detailPlaceholder")}
            aria-invalid={!!errors.detail}
          />
          {errors.detail && (
            <small className="field-error">
              <AlertCircle size={13} />
              {errors.detail}
            </small>
          )}
        </div>
        <div className="field-group two-col-responsive">
          <div className="field">
            <label htmlFor="availableFrom">
              {t("createListing.availableFromLabel")}
            </label>
            <input
              id="availableFrom"
              type="date"
              min={today}
              value={availableFrom}
              onChange={(e) => {
                const nextFrom = e.target.value;
                setAvailableFrom(nextFrom);
                if (availableUntil && nextFrom && availableUntil < nextFrom) {
                  setAvailableUntil(nextFrom);
                }
                if (errors.availableFrom) {
                  setErrors((prev) => ({ ...prev, availableFrom: "" }));
                }
              }}
              aria-invalid={!!errors.availableFrom}
            />
            {errors.availableFrom && (
              <small className="field-error">
                <AlertCircle size={13} />
                {errors.availableFrom}
              </small>
            )}
          </div>
          <div className="field">
            <label htmlFor="availableUntil">
              {t("createListing.availableUntilLabel")}
            </label>
            <input
              id="availableUntil"
              type="date"
              min={minUntilDate}
              value={availableUntil}
              onChange={(e) => {
                setAvailableUntil(e.target.value);
                if (errors.availableUntil) {
                  setErrors((prev) => ({ ...prev, availableUntil: "" }));
                }
              }}
              aria-invalid={!!errors.availableUntil}
            />
            {errors.availableUntil && (
              <small className="field-error">
                <AlertCircle size={13} />
                {errors.availableUntil}
              </small>
            )}
          </div>
        </div>
        <div className="form-section-title section-spaced">
          <span className="section-number">02</span>
          <div>
            <h2>{t("createListing.section2Title")}</h2>
            <p>{t("createListing.section2Desc")}</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg, .jpeg, .png, .webp"
          className="visually-hidden"
          onChange={chooseImage}
        />
        <button
          type="button"
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
        >
          {imagePreview ? (
            <img
              className="upload-preview"
              src={imagePreview}
              alt={t("createListing.previewAlt")}
            />
          ) : (
            <>
              <span className="upload-icon">
                <ImagePlus size={28} />
              </span>
              <strong>{t("createListing.uploadPrompt")}</strong>
              <span>{t("createListing.uploadHint")}</span>
            </>
          )}{" "}
          {/* จะกำหนดขนาดเท่าไรเช่น ไม่เกิน 3 MB */}
          {imagePreview && (
            <span className="upload-change">
              <UploadCloud size={15} /> {imageFileName || t("createListing.changeImage")}
            </span>
          )}
        </button>
        {errors.image && <small className="field-error">{errors.image}</small>}
        <div className="form-note">
          <AlertCircle size={16} />
          <span>
            {t("createListing.requiredNotePrefix")} <b>*</b> {t("createListing.requiredNoteSuffix")}
          </span>
        </div>
        {/* Inline Alert สำหรับแสดง Error ตอนกดบันทึก */}
        {submitError && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '6px' }}>
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={() => navigate(-1)}
          >
            {t("common.cancel")}
          </button>
          <button type="submit" className="button button-primary">
            <CheckCircle2 size={17} />
            {editingItem ? t("common.saveChanges") : t("common.publish")}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
