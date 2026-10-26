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
        eyebrow={t("browse.eyebrow")}
        title={t("browse.title")}
        subtitle={t("browse.subtitle")}
        action={
          <span className="result-count">{t("browse.resultCount", { count: availableItems.length })}</span>
        }
      />
      <section className="filter-panel">
        <label className="search-box">
          <Search size={19} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("browse.searchPlaceholder")}
          />
        </label>
        <label className="select-box">
          <span>{t("browse.categoryLabel")}</span>
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
          title={t("browse.emptyTitle")}
          description={t("browse.emptyDesc")}
        />
      )}
      <div className="bottom-cta">
        <div>
          <strong>{t("browse.ctaTitle")}</strong>
          <p>{t("browse.ctaDesc")}</p>
        </div>
        <Link to="/create" className="button button-primary">
          <Plus size={17} /> {t("browse.ctaButton")}
        </Link>
      </div>
    </div>
  );
}
