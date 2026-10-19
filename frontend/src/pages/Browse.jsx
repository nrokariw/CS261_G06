import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
// FIX : ลบ import ที่ไม่ได้ใช้ 
import { Search, Plus } from "lucide-react";
import { ALL_CATEGORIES_ID, BORROWABLE_STATUS, getCategories } from "../data"; // ✅ FIX: แทน CATEGORIES
import { ItemCard, PageHeading, EmptyState } from "../components/UI";

export default function Browse({ items }) {
  const [query, setQuery] = useState("");
  // FIX : ใช้ค่าคงที่ ALL_CATEGORIES_ID แทนสตริง ทั้งหมด
  const [category, setCategory] = useState(ALL_CATEGORIES_ID);

  // FIX : หมวดหมู่ดึงจากสิ่งของที่มีอยู่จริง
  const categories = useMemo(() => getCategories(items), [items]);
  // FIX : ถ้าหมวดที่เลือกไม่มีสิ่งของเหลืออยู่แล้ว ให้ถือว่าเลือกทั้งหมด
  const activeCategory = categories.includes(category) ? category : ALL_CATEGORIES_ID;
  const categoryOptions = [
    { id: ALL_CATEGORIES_ID, label: "ทั้งหมด" },
    ...categories.map((c) => ({ id: c, label: c })),
  ];

  const availableItems = useMemo(
    () =>
      items.filter((item) => {
        // FIX : ค้นหาจากชื่อและหมวดหมู่ตาม spec
        const text = `${item.name} ${item.category}`.toLowerCase();
        return (
          // FIX : แสดง available/reserved/borrowed (ซ่อนเฉพาะ unavailable/deleted)
          // เพื่อให้คนอื่นขอยืมคนละช่วงเวลาได้ เพราะระบบเช็กวันที่ซ้อนตอนส่งคำขอ
          BORROWABLE_STATUS.includes(item.status) &&
          text.includes(query.toLowerCase()) &&
          (activeCategory === ALL_CATEGORIES_ID || item.category === activeCategory)
        );
      }),
    [items, query, activeCategory],
  );

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="DISCOVER & BORROW"
        title="ค้นหาสิ่งของ"
        subtitle="ค้นหาของที่เพื่อนๆ เปิดให้ยืมภายในมหาวิทยาลัย"
        action={
          <span className="result-count">{availableItems.length} รายการ</span>
        }
      />
      <section className="filter-panel">
        <label className="search-box">
          <Search size={19} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสิ่งของหรือหมวดหมู่"
          />
        </label>
        <label className="select-box">
          <span>หมวดหมู่</span>
          <select
            value={activeCategory}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="category-chips">
        {categoryOptions.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`chip ${activeCategory === c.id ? "chip-active" : ""}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {availableItems.length ? (
        <section className="item-grid">
          {availableItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="ไม่พบสิ่งของที่ค้นหา"
          description="ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น"
        />
      )}
      <div className="bottom-cta">
        <div>
          <strong>ลงประกาศของที่ให้ยืม</strong>
          <p>เพิ่มรายละเอียดของที่อยากให้เพื่อนยืมได้เลย</p>
        </div>
        <Link to="/create" className="button button-primary">
          <Plus size={17} /> สร้างประกาศ
        </Link>
      </div>
    </div>
  );
}
