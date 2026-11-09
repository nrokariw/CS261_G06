import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Plus, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { CATEGORIES, normalizeCategoryKey } from "../data";
import { ItemCard, PageHeading, EmptyState, getLocalizedCategoryLabel } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { getAvailableItems } from "../api/itemsApi";

export default function Browse({ items: propItems, requests = [], loading: propLoading }) {
  const { user, token } = useAuth();
  const [localItems, setLocalItems] = useState([]);
  const [localLoading, setLocalLoading] = useState(propItems === undefined);
  const [error, setError] = useState(null);

  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");

  // เพิ่ม useEffect เพื่อดึงข้อมูลจาก API หากไม่ได้ส่ง items ผ่าน props
  useEffect(() => {
    if (propItems !== undefined) return;
    async function loadData() {
      try {
        setLocalLoading(true);
        const data = await getAvailableItems("AVAILABLE", token); 
        setLocalItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLocalLoading(false);
      }
    }
    loadData();
  }, [propItems, token]);

  const rawItems = propItems !== undefined ? propItems : localItems;
  const isLoading = propItems !== undefined ? Boolean(propLoading) : localLoading;

  const availableItems = useMemo(
    () =>
      rawItems
        .map((item) => {
          const myRequest = (requests || []).find((r) => {
            const matchesBorrower = Boolean(
              (user?.studentId && String(r.borrowerId) === String(user.studentId)) ||
              (user?.id && String(r.borrowerId) === String(user.id)) ||
              (user?.name && r.borrower === user.name)
            );
            if (!matchesBorrower) return false;
            const matchesItem = String(r.itemId) === String(item.id);
            return matchesItem;
          });
          if (myRequest) {
            const reqStatus = String(myRequest.status || "").toLowerCase();
            const displayStatus = reqStatus === "accepted" ? "reserved" : reqStatus;
            return { ...item, status: displayStatus };
          }
          const itemStatus = String(item.status || "").toLowerCase();
          if (itemStatus === "accepted") {
            return { ...item, status: "reserved" };
          }
          return item;
        })
        .filter((item) => {
          const itemCategoryKey = normalizeCategoryKey(item.category);
          const categoryText = getLocalizedCategoryLabel(item.category, t);
          const text =
            `${item.name || ""} ${categoryText} ${item.owner || ""}`.toLowerCase();
          const itemStatus = String(item.status || "").toLowerCase();
          const isVisible =
            itemStatus === "available" ||
            itemStatus === "pending" ||
            itemStatus === "accepted" ||
            itemStatus === "reserved" ||
            itemStatus === "change_requested" ||
            itemStatus === "rejected";
          return (
            isVisible &&
            text.includes(query.toLowerCase()) &&
            (category === "ALL" || !category || itemCategoryKey === category)
          );
        }),
    [rawItems, requests, user, query, category],
  );

  if (isLoading) return <div className="page-stack">{t("common.loading", { defaultValue: "กำลังโหลดข้อมูล..." })}</div>;
  if (error) return <div className="page-stack"><EmptyState title={t("common.error", { defaultValue: "เกิดข้อผิดพลาด" })} description={error} /></div>;

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
