import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ImagePlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
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
  ALLOWED_IMAGE_TYPES,
  ITEM_DETAIL_MAX_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_MB,
  REDIRECT_DELAY_MS,
} from "../constants/config";

export default function CreateListing({ items, setItems }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const editingItem = items.find((i) => i.id === editId);
  const [name, setName] = useState(editingItem?.name || "");
  const [category, setCategory] = useState(
    normalizeCategoryKey(editingItem?.category) || "",
  );
  const [detail, setDetail] = useState(editingItem?.detail || "");
  
  // เปลี่ยนเก็บเป็น File Object แทน Base64 String
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(editingItem?.image || "");
  const [imageFileName, setImageFileName] = useState("");

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef(null);

  function validate() {
    const next = {};
    if (!name.trim()) next.name = t("validation.itemNameRequired");
    if (!category) next.category = t("validation.categoryRequired");
    if (!detail.trim()) next.detail = t("validation.detailRequired");
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

    // แนบไฟล์จริงไปกับ Key ที่ Backend รอรับ 
    if (imageFile) {
      formData.append("imageFile", imageFile);
    }

    try {
      // ส่ง Request หรือ ยิง API ไปหา Backend
      const studentId = user?.studentId || "6400000001"; // ดึงจาก Auth หรือค่าเริ่มต้น
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

  return (
    <div className="page-stack narrow-page">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> {t("common.back")}
      </button>
      <PageHeading
        eyebrow={editingItem ? t("createListing.eyebrowEdit") : t("createListing.eyebrowCreate")}
        title={editingItem ? t("createListing.titleEdit") : t("createListing.titleCreate")}
        subtitle={t("createListing.subtitle")}
      />{" "}
      {/* หัวประกาศ */}
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
    </div>
  );
}
