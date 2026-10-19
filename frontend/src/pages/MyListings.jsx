import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Plus, PackageOpen, Search } from "lucide-react";
import { PageHeading, StatusBadge, EmptyState, safeImageSrc } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

export default function MyListings({ items, setItems }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState("");
  const mine = items.filter(
    (item) =>
      item.owner === user.name &&
      item.status !== "deleted" &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  );

  // FIX : แก้ไข/ลบได้เฉพาะสถานะ available (reserved/borrowed/unavailable ห้าม)
  const canModify = (item) =>
    item.owner === user.name && item.status === "available";

  function removeItem(id) {
    const target = items.find((i) => i.id === id);
    if (!target || !canModify(target)) {
      setDeleteId(null);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "deleted" } : item,
      ),
    );
    setDeleteId(null);
    setNotice("ลบประกาศเรียบร้อยแล้ว");
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="MY LISTINGS"
        title="ประกาศของฉัน"
        subtitle="จัดการสิ่งของที่คุณลงประกาศไว้ แก้ไขรายละเอียดหรือลบประกาศได้"
        action={
          <Link to="/create" className="button button-primary">
            <Plus size={17} /> เพิ่มประกาศใหม่
          </Link>
        }
      />
      {notice && (
        <div className="alert alert-success">
          {notice}
          <button onClick={() => setNotice("")} className="alert-close">
            ปิด
          </button>
        </div>
      )}

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาประกาศของฉัน"
          />
        </label>
        <span className="result-count">{mine.length} รายการ</span>
      </div>

      {mine.length ? (
        <div className="my-listings-list">
          {mine.map((item) => (
            <article className="listing-row" key={item.id}>
              {safeImageSrc(item.image) ? (
                <img
                  className="listing-thumb"
                  src={safeImageSrc(item.image)}
                  alt={item.name}
                />
              ) : (
                <div className="listing-thumb image-placeholder">
                  <PackageOpen size={30} />
                </div>
              )}
              <div className="listing-details">
                <span className="category-label">{item.category}</span>
                <h3>{item.name}</h3>
                <p>{item.detail}</p>
                <StatusBadge status={item.status} />
              </div>

              <div className="listing-actions">
                {/* FIX : ปิดปุ่มแก้ไข/ลบเมื่อสิ่งของ reserved/borrowed */}
                {canModify(item) ? (
                  <Link
                    className="button button-outline button-sm"
                    to={`/create?edit=${item.id}`}
                  >
                    <Pencil size={15} /> แก้ไข
                  </Link>
                ) : (
                  <button
                    className="button button-outline button-sm"
                    disabled
                    title="แก้ไขได้เฉพาะเมื่อสิ่งของพร้อมให้ยืม"
                  >
                    <Pencil size={15} /> แก้ไข
                  </button>
                )}
                <button
                  className="button button-danger-outline button-sm"
                  onClick={() => setDeleteId(item.id)}
                  disabled={!canModify(item)}
                  title={
                    canModify(item) ? undefined : "ลบได้เฉพาะเมื่อสิ่งของพร้อมให้ยืม"
                  }
                >
                  <Trash2 size={15} /> ลบ
                </button>
              </div>
              {deleteId === item.id && (
                <div className="delete-confirm">
                  <strong>ยืนยันการลบ “{item.name}”?</strong>
                  <span>รายการจะถูกซ่อนจากหน้าค้นหา</span>
                  <div>
                    <button
                      className="button button-danger button-sm"
                      onClick={() => removeItem(item.id)}
                    >
                      ยืนยันลบ
                    </button>
                    <button
                      className="button button-outline button-sm"
                      onClick={() => setDeleteId(null)}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีประกาศ"
          description="ลองค้นหาด้วยคำอื่น หรือสร้างประกาศเพื่อแบ่งปันสิ่งของ"
        />
      )}
    </div>
  );
}
