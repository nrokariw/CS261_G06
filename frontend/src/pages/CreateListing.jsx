import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ImagePlus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { CATEGORIES } from "../data";
import { PageHeading } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

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
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  function validate() {
    const next = {};
    if (!name.trim()) next.name = "กรุณากรอกชื่อสิ่งของ";
    if (!category) next.category = "กรุณาเลือกหมวดหมู่";
    if (!detail.trim()) next.detail = "กรุณากรอกรายละเอียด";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function chooseImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "กรุณาเลือกไฟล์รูปภาพเท่านั้น" }));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "รูปภาพต้องมีขนาดไม่เกิน 3 MB" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
    setImageFileName(file.name);
    setErrors((prev) => ({ ...prev, image: "" }));
  }

  function submit(e) {
    e.preventDefault();
    setSuccess("");
    if (!validate()) return;
    const record = {
      id: editingItem?.id || crypto.randomUUID(),
      name: name.trim(),
      category,
      detail,
      image,
      owner: editingItem?.owner || user.name,
      status: "available",
    };
    if (editingItem)
      setItems((prev) =>
        prev.map((item) => (item.id === editingItem.id ? record : item)),
      );
    else setItems((prev) => [record, ...prev]);
    setSuccess(
      editingItem ? "แก้ไขประกาศเรียบร้อยแล้ว" : "สร้างประกาศเรียบร้อยแล้ว",
    );
    window.setTimeout(() => navigate("/my-listings"), 650);
  }

  return (
    <div className="page-stack narrow-page">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> กลับ
      </button>
      <PageHeading
        eyebrow={editingItem ? "EDIT LISTING" : "CREATE LISTING"}
        title={editingItem ? "แก้ไขประกาศ" : "ลงประกาศสิ่งของ"}
        subtitle="กรอกข้อมูลให้ครบเพื่อให้เพื่อนค้นหาและขอยืมสิ่งของได้ง่ายขึ้น"
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
            หมวดหมู่ <span className="required">*</span>
          </label>
          <select
            id="item-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-invalid={!!errors.category}
          >
            <option value="">เลือกหมวดหมู่</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
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
            <h2>รูปภาพสิ่งของ</h2>
            <p>เพิ่มรูปเพื่อให้ผู้ยืมเห็นสภาพสิ่งของ (ไม่บังคับ)</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={chooseImage}
        />
        <button
          type="button"
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
        >
          {image ? (
            <img
              className="upload-preview"
              src={image}
              alt="ตัวอย่างรูปสิ่งของ"
            />
          ) : (
            <>
              <span className="upload-icon">
                <ImagePlus size={28} />
              </span>
              <strong>คลิกเพื่ออัปโหลดรูปภาพ</strong>
              <span>รองรับ JPG, PNG หรือ WEBP</span>
            </>
          )}{" "}
          {/* จะกำหนดขนาดเท่าไรเช่น ไม่เกิน 3 MB */}
          {image && (
            <span className="upload-change">
              <UploadCloud size={15} /> {imageFileName || "เปลี่ยนรูปภาพ"}
            </span>
          )}
        </button>
        {errors.image && <small className="field-error">{errors.image}</small>}
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
          <button type="submit" className="button button-primary">
            <CheckCircle2 size={17} />
            {editingItem ? "บันทึกการแก้ไข" : "เผยแพร่"}
          </button>
        </div>
      </form>
    </div>
  );
}
