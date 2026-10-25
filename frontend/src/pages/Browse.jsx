import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Plus, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { CATEGORIES, getCategoryLabel, normalizeCategoryKey } from "../data";
import { ItemCard, PageHeading, EmptyState } from "../components/UI";

export default function Browse({ items }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const availableItems = useMemo(
    () =>
      items.filter((item) => {
        const itemCategoryKey = normalizeCategoryKey(item.category);
        const categoryText = getCategoryLabel(itemCategoryKey);
        const text =
          `${item.name} ${categoryText} ${item.owner}`.toLowerCase();
        return (
          item.status !== "deleted" &&
          text.includes(query.toLowerCase()) &&
          (category === "ALL" || !category || itemCategoryKey === category)
        );
      }),
    [items, query, category],
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
            placeholder="ค้นหาชื่อสิ่งของหรือเจ้าของ"
          />
        </label>
        <label className="select-box">
          <span>หมวดหมู่</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">{t("categories.ALL", { defaultValue: getCategoryLabel("ALL") })}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`, { defaultValue: getCategoryLabel(c) })}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="category-chips">
        {["ALL", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`chip ${category === c ? "chip-active" : ""}`}
          >
            {t(`categories.${c}`, { defaultValue: getCategoryLabel(c) })}
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
