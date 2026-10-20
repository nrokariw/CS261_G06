import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ImagePlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { CATEGORY_SUGGESTIONS, getCategories } from "../data";
import { PageHeading, safeImageSrc } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_BYTES = 10 * 1024 * 1024; 
const TARGET_BYTES = 150 * 1024; // เป้าหมายขนาด data URL หลังย่อ ≤ 150KB
const DIMENSIONS = [800, 640, 480, 360];
const QUALITIES = [0.8, 0.7, 0.6, 0.5, 0.4];


function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let result = "";
      for (const maxDim of DIMENSIONS) {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; // PNG โปร่งใสจะกลายเป็นพื้นขาวเมื่อแปลงเป็น JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const q of QUALITIES) {
          result = canvas.toDataURL("image/jpeg", q);
          if (result.length * 0.75 <= TARGET_BYTES) return resolve(result);
        }
      }
      resolve(result);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

export default function CreateListing({ items, setItems }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const editingItem = items.find((i) => i.id === editId);
  const [name, setName] = useState(editingItem?.name || "");
  const [category, setCategory] = useState(editingItem?.category || "");
  const [detail, setDetail] = useState(editingItem?.detail || "");
  const [image, setImage] = useState(editingItem?.image || "");
  const [imageFileName, setImageFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // FIX : แก้ไขได้เฉพาะเจ้าของ และเมื่อสถานะเป็น available เท่านั้น
  const editBlocked =
    !!editId &&
    (!editingItem ||
      editingItem.owner !== user.name ||
      editingItem.status !== "available");

  function validate() {
    const next = {};
    if (!name.trim()) next.name = "กรุณากรอกชื่อสิ่งของ";
    // FIX : หมวดหมู่เป็น free-text → ตรวจว่าไม่ว่างและไม่ยาวเกินไป
    if (!category.trim()) next.category = "กรุณากรอกหมวดหมู่";
    else if (category.trim().length > 50)
      next.category = "หมวดหมู่ต้องไม่เกิน 50 ตัวอักษร";
    if (!detail.trim()) next.detail = "กรุณากรอกรายละเอียด";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function chooseImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: "รองรับเฉพาะไฟล์ JPG, PNG, WEBP" }));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_RAW_BYTES) {
      setErrors((prev) => ({ ...prev, image: "รูปภาพต้องมีขนาดไม่เกิน 10 MB" }));
      e.target.value = "";
      return;
    }
    setProcessing(true);
    try {
      setImage(await compressImage(file));
      setImageFileName(file.name);
      setErrors((prev) => ({ ...prev, image: "" }));
    } catch {
      setErrors((prev) => ({ ...prev, image: "ไม่สามารถอ่านไฟล์รูปภาพนี้ได้" }));
    } finally {
      setProcessing(false);
    }
  }

  // FIX : เพิ่มปุ่ม "ลบรูปภาพ"
  function removeImage() {
    setImage("");
    setImageFileName("");
    setErrors((prev) => ({ ...prev, image: "" }));
    if (fileRef.current) fileRef.current.value = ""; 
  }

  function submit(e) {
    e.preventDefault();
    setSuccess("");
    if (processing || !validate()) return;
    const record = {
      id: editingItem?.id || crypto.randomUUID(),
      name: name.trim(),
      category: category.trim(),
      detail,
      image,
      owner: editingItem?.owner || user.name,
      status: editingItem?.status || "available",
    };
    if (editingItem)
      setItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? record : item)),
      );
    else setItems((prev) => [record, ...prev]);
    setSuccess(
      editingItem ? "แก้ไขประกาศเรียบร้อยแล้ว" : "สร้างประกาศเรียบร้อยแล้ว",
    );
    timerRef.current = window.setTimeout(() => navigate("/my-listings"), 650);
  }

  // FIX : ถ้าไม่ใช่เจ้าของ / สถานะไม่ใช่ available / ไม่พบประกาศ → ไม่แสดงฟอร์มแก้ไข
  if (editBlocked)
    return (
      <div className="not-found">
        <h1>ไม่สามารถแก้ไขประกาศนี้ได้</h1>
        <p>
          แก้ไขได้เฉพาะเจ้าของประกาศ และเมื่อสิ่งของอยู่ในสถานะ "พร้อมให้ยืม" เท่านั้น
        </p>
        <Link to="/my-listings" className="button button-primary">
          กลับไปประกาศของฉัน
        </Link>
      </div>
    );

  const previewSrc = safeImageSrc(image);
  const categorySuggestions = Array.from(
    new Set([...CATEGORY_SUGGESTIONS, ...getCategories(items)]),
  );

  return (
    <div className="page-stack narrow-page">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> กลับ
      </button>
      <PageHeading
        eyebrow={editingItem ? "EDIT LISTING" : "CREATE LISTING"}
        title={editingItem ? "แก้ไขประกาศ" : "ลงประกาศสิ่งของ"}
        subtitle="กรอกข้อมูลให้ครบเพื่อให้เพื่อนค้นหาและขอยืมสิ่งของได้ง่ายขึ้น"
      />
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
            <h2>ข้อมูลสิ่งของ</h2>
            <p>รายละเอียดพื้นฐานของสิ่งของที่ต้องการแบ่งปัน</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="item-name">
            ชื่อสิ่งของ <span className="required">*</span>
          </label>
          <input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น เครื่องคิดเลขวิทยาศาสตร์"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "err-name" : undefined}
          />
          {errors.name && (
            <small className="field-error" id="err-name">
              <AlertCircle size={13} />
              {errors.name}
            </small>
          )}
        </div>
        <div className="field">
          <label htmlFor="item-category">
            หมวดหมู่ <span className="required">*</span>
          </label>
          {/* FIX : เปลี่ยน <select> เป็น <input> + datalist (พิมพ์หมวดหมู่เองได้ มีคำแนะนำให้เลือก) */}
          <input
            id="item-category"
            list="category-suggestions"
            value={category}
            maxLength={50}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="เช่น อุปกรณ์การเรียน หรือพิมพ์หมวดหมู่ใหม่"
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? "err-category" : undefined}
          />
          <datalist id="category-suggestions">
            {categorySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && (
            <small className="field-error" id="err-category">
              <AlertCircle size={13} />
              {errors.category}
            </small>
          )}
        </div>
        <div className="field">
          <div className="label-row">
            <label htmlFor="item-detail">
              รายละเอียด <span className="required">*</span>
            </label>
            <span className="character-count">{detail.length}/500</span>
          </div>
          <textarea
            id="item-detail"
            maxLength={500}
            rows={5}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="ระบุสภาพสิ่งของ เงื่อนไขการยืม และสถานที่นัดรับ"
            aria-invalid={!!errors.detail}
            aria-describedby={errors.detail ? "err-detail" : undefined}
          />
          {errors.detail && (
            <small className="field-error" id="err-detail">
              <AlertCircle size={13} />
              {errors.detail}
            </small>
          )}
        </div>
        <div className="form-section-title section-spaced">
          <span className="section-number">02</span>
          <div>
            <h2>รูปภาพสิ่งของ</h2>
            <p>เพิ่มรูปเพื่อให้ผู้ยืมเห็นสภาพสิ่งของ (ไม่บังคับ)</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="visually-hidden"
          onChange={chooseImage}
          aria-describedby={errors.image ? "err-image" : undefined}
        />
        <button
          type="button"
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
          disabled={processing}
        >
          {previewSrc ? (
            <img
              className="upload-preview"
              src={previewSrc}
              alt="ตัวอย่างรูปสิ่งของ"
            />
          ) : (
            <>
              <span className="upload-icon">
                <ImagePlus size={28} />
              </span>
              <strong>
                {processing ? "กำลังประมวลผลรูปภาพ..." : "คลิกเพื่ออัปโหลดรูปภาพ"}
              </strong>
              <span>รองรับ JPG, PNG หรือ WEBP (ระบบจะย่อรูปให้อัตโนมัติ)</span>
            </>
          )}
          {previewSrc && (
            <span className="upload-change">
              <UploadCloud size={15} /> {imageFileName || "เปลี่ยนรูปภาพ"}
            </span>
          )}
        </button>
        {previewSrc && (
          <button
            type="button"
            className="button button-danger-outline button-sm"
            onClick={removeImage}
          >
            <Trash2 size={15} /> ลบรูปภาพ
          </button>
        )}
        {errors.image && (
          <small className="field-error" id="err-image">
            {errors.image}
          </small>
        )}
        <div className="form-note">
          <AlertCircle size={16} />
          <span>
            ช่องที่มีเครื่องหมาย <b>*</b> จำเป็นต้องกรอก
          </span>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={() => navigate(-1)}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={processing}
          >
            <CheckCircle2 size={17} />
            {editingItem ? "บันทึกการแก้ไข" : "เผยแพร่"}
          </button>
        </div>
      </form>
    </div>
  );
}
