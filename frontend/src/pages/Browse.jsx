import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Plus, ArrowRight, Calendar, HandHeart } from "lucide-react";
import { CATEGORIES, getCategoryLabel, normalizeCategoryKey } from "../data";
import { ItemCard, PageHeading, EmptyState } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { getAvailableItems } from "../api/itemsApi";
import { listWantedPosts } from "../api/wantedPostsApi";

export default function Browse({
  items: propItems,
  requests = [],
  loading: propLoading,
  initialTab = "items",
}) {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localItems, setLocalItems] = useState([]);
  const [localLoading, setLocalLoading] = useState(propItems === undefined);
  const [error, setError] = useState(null);

  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");

  const activeTab =
    searchParams.get("tab") === "wanted" || initialTab === "wanted"
      ? "wanted"
      : "items";

  const [wantedPosts, setWantedPosts] = useState([]);
  const [wantedLoading, setWantedLoading] = useState(false);
  const [wantedError, setWantedError] = useState(null);

  const handleTabChange = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === "wanted") {
      next.set("tab", "wanted");
    } else {
      next.delete("tab");
    }
    setSearchParams(next, { replace: true });
  };

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

  useEffect(() => {
    if (activeTab !== "wanted") return;
    let cancelled = false;
    setWantedLoading(true);
    setWantedError(null);
    listWantedPosts({}, token)
      .then((data) => {
        if (!cancelled) {
          setWantedPosts(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setWantedError(err.message || t("wanted.loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setWantedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, token, t]);

  const filteredWantedPosts = useMemo(() => {
    return (wantedPosts || []).filter((post) => {
      const catMatches =
        category === "ALL" ||
        normalizeCategoryKey(post.category) === normalizeCategoryKey(category);
      const q = query.trim().toLowerCase();
      const qMatches =
        !q ||
        (post.title || "").toLowerCase().includes(q) ||
        (post.description || "").toLowerCase().includes(q) ||
        (post.requesterName || "").toLowerCase().includes(q);
      return catMatches && qMatches;
    });
  }, [wantedPosts, category, query]);

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
          return myRequest ? { ...item, status: myRequest.status } : item;
        })
        .filter((item) => {
          const itemCategoryKey = normalizeCategoryKey(item.category);
          const categoryText = getCategoryLabel(itemCategoryKey);
          const text =
            `${item.name || ""} ${categoryText} ${item.owner || ""}`.toLowerCase();
          const itemStatus = String(item.status || "").toLowerCase();
          const isVisible =
            itemStatus === "available" ||
            itemStatus === "pending" ||
            itemStatus === "accepted" ||
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
        eyebrow={activeTab === "wanted" ? t("wanted.eyebrow") : t("browse.eyebrow")}
        title={t("browse.title")}
        subtitle={t("browse.subtitle")}
        action={
          <span className="result-count">
            {activeTab === "wanted"
              ? t("wanted.resultCount", { count: filteredWantedPosts.length })
              : t("browse.resultCount", { count: availableItems.length })}
          </span>
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
      {activeTab === "wanted" ? (
        wantedLoading ? (
          <div className="card">
            <p>{t("common.loading", { defaultValue: "กำลังโหลดข้อมูล..." })}</p>
          </div>
        ) : wantedError ? (
          <EmptyState
            title={t("common.error", { defaultValue: "เกิดข้อผิดพลาด" })}
            description={wantedError}
          />
        ) : filteredWantedPosts.length ? (
          <section className="item-grid">
            {filteredWantedPosts.map((post) => (
              <Link
                key={post.id}
                to={`/wanted/${post.id}`}
                className="card wanted-card"
              >
                <div className="wanted-card-top">
                  <span className="chip">
                    {t(`categories.${post.category}`, {
                      defaultValue: getCategoryLabel(post.category),
                    })}
                  </span>
                  <span className={`status-badge status-${post.status}`}>
                    {t(`wanted.status.${post.status}`, post.status)}
                  </span>
                </div>
                <h3 className="wanted-card-title">{post.title}</h3>
                {post.description && (
                  <p className="wanted-card-desc">{post.description}</p>
                )}
                <div className="wanted-card-meta">
                  <span>{post.requesterName}</span>
                  {(post.neededFrom || post.neededUntil) && (
                    <span className="wanted-card-dates">
                      <Calendar size={13} />
                      {post.neededFrom
                        ? new Date(post.neededFrom).toLocaleDateString(
                            i18n.language === "en" ? "en-US" : "th-TH",
                            { month: "short", day: "numeric" }
                          )
                        : "—"}
                    </span>
                  )}
                </div>
                <div className="wanted-card-footer">
                  <span>
                    {t("wanted.pendingOffersCount", {
                      count: post.pendingOfferCount || 0,
                    })}
                  </span>
                  <span className="wanted-card-link">
                    {t("wanted.viewDetails")} <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <EmptyState
            title={t("wanted.emptyTitle")}
            description={t("wanted.emptyDesc")}
          />
        )
      ) : availableItems.length ? (
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
          <strong>
            {activeTab === "wanted"
              ? t("wanted.createCtaTitle")
              : t("browse.ctaTitle")}
          </strong>
          <p>
            {activeTab === "wanted"
              ? t("wanted.createCtaDesc")
              : t("browse.ctaDesc")}
          </p>
        </div>
        <Link
          to={activeTab === "wanted" ? "/create?tab=wanted" : "/create"}
          className="button button-primary"
        >
          <Plus size={17} />{" "}
          {activeTab === "wanted"
            ? t("wanted.createCtaButton")
            : t("browse.ctaButton")}
        </Link>
      </div>
    </div>
  );
}
