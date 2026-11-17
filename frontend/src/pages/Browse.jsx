import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  ArrowUpRight,
  Calendar,
  HandHeart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getActiveCategoryCodes, normalizeCategoryKey } from "../data";
import {
  Avatar,
  CategoryBadge,
  ItemCard,
  PageHeading,
  EmptyState,
  StatusBadge,
  getLocalizedCategoryLabel,
} from "../components/UI";
import { isHandedOver, isReturned } from "../components/HandoverModal";
import { useAuth } from "../contexts/AuthContext";
import { getAvailableItems } from "../api/itemsApi";
import { listWantedPosts } from "../api/wantedPostsApi";
import { ITEMS_PER_PAGE } from "../constants/config";

export default function Browse({
  items: propItems,
  requests = [],
  categories: propCategories,
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
  const [currentPage, setCurrentPage] = useState(1);
  const activeCategories = Array.isArray(propCategories)
    ? propCategories
    : getActiveCategoryCodes();

  const activeTab =
    searchParams.get("tab") === "wanted" || initialTab === "wanted"
      ? "wanted"
      : "items";

  useEffect(() => {
    setCurrentPage(1);
  }, [query, category, activeTab]);

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
      const categoryText = getLocalizedCategoryLabel(
        post.category,
        t,
        i18n.language,
      ).toLowerCase();
      const qMatches =
        !q ||
        (post.title || "").toLowerCase().includes(q) ||
        (post.description || "").toLowerCase().includes(q) ||
        (post.requesterName || "").toLowerCase().includes(q) ||
        categoryText.includes(q);
      return catMatches && qMatches;
    });
  }, [wantedPosts, category, query, t, i18n.language]);

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
            if (isReturned(r) || r.status === "cancelled") return false;
            const matchesItem = String(r.itemId) === String(item.id);
            return matchesItem;
          });
          const itemStatus = String(item.status || "").toLowerCase();
          if (myRequest) {
            const reqStatus = String(myRequest.status || "").toLowerCase();
            if (
              itemStatus === "borrowed" ||
              String(myRequest.transactionStatus || "").toLowerCase() === "active" ||
              isHandedOver(myRequest, { ...item, status: itemStatus })
            ) {
              return { ...item, status: "borrowed" };
            }
            const displayStatus = reqStatus === "accepted" ? "reserved" : reqStatus;
            return { ...item, status: displayStatus };
          }
          if (itemStatus === "accepted") {
            return { ...item, status: "reserved" };
          }
          return item;
        })
        .filter((item) => {
          const itemCategoryKey = normalizeCategoryKey(item.category);
          const categoryText = getLocalizedCategoryLabel(item.category, t, i18n.language);
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
    [rawItems, requests, user, query, category, t, i18n.language],
  );

  const activeListCount =
    activeTab === "wanted" ? filteredWantedPosts.length : availableItems.length;
  const totalPages = Math.max(1, Math.ceil(activeListCount / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return availableItems.slice(start, start + ITEMS_PER_PAGE);
  }, [availableItems, safePage]);

  const paginatedWantedPosts = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredWantedPosts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWantedPosts, safePage]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 text-sm text-[var(--muted)]">
        {t("common.loading", { defaultValue: "กำลังโหลดข้อมูล..." })}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          title={t("common.error", { defaultValue: "เกิดข้อผิดพลาด" })}
          description={error}
        />
      </div>
    );
  }

  const formatShortDate = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val).slice(0, 10);
    return d.toLocaleDateString(i18n.language === "en" ? "en-US" : "th-TH", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={activeTab === "wanted" ? t("wanted.eyebrow") : t("browse.eyebrow")}
        title={t("browse.title")}
        subtitle={t("browse.subtitle")}
        action={
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[var(--surface-tint)] border border-[var(--border)] text-xs font-semibold text-[var(--text)]">
            {activeTab === "wanted"
              ? t("wanted.resultCount", { count: filteredWantedPosts.length })
              : t("browse.resultCount", { count: availableItems.length })}
          </span>
        }
      />

      <div
        className="flex items-center gap-2 border-b border-[var(--border)] pb-3 overflow-x-auto"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "items"}
          className={`inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[13.5px] font-medium border cursor-pointer transition-colors ${
            activeTab === "items"
              ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-xs"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
          }`}
          onClick={() => handleTabChange("items")}
        >
          {t("wanted.tabLendItems")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "wanted"}
          className={`inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[13.5px] font-medium border cursor-pointer transition-colors ${
            activeTab === "wanted"
              ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-xs"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
          }`}
          onClick={() => handleTabChange("wanted")}
        >
          <HandHeart size={16} /> {t("wanted.tabWantedPosts")}
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs">
        <label className="flex items-center gap-2.5 px-3.5 h-11 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--muted)] focus-within:border-[var(--primary)] focus-within:bg-[var(--surface)] focus-within:ring-2 focus-within:ring-[var(--primary)]/15 transition-colors">
          <Search size={18} className="shrink-0" />
          <input
            className="w-full min-w-0 bg-transparent border-0 outline-none focus:outline-none text-[13px] text-[var(--text)] placeholder:text-[var(--muted)]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("browse.searchPlaceholder")}
          />
        </label>
        <label className="flex items-center justify-between gap-2.5 px-3.5 h-11 rounded-[10px] border border-[var(--border)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--muted)] focus-within:border-[var(--primary)] focus-within:bg-[var(--surface)] focus-within:ring-2 focus-within:ring-[var(--primary)]/15 transition-colors">
          <span className="shrink-0">{t("browse.categoryLabel")}</span>
          <select
            className="min-w-0 flex-1 bg-transparent border-0 outline-none focus:outline-none text-[13px] font-medium text-[var(--text)] cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">{getLocalizedCategoryLabel("ALL", t, i18n.language)}</option>
            {activeCategories.map((c) => (
              <option key={c} value={c}>
                {getLocalizedCategoryLabel(c, t, i18n.language)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="flex flex-wrap gap-2">
        {["ALL", ...activeCategories].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
              category === c
                ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-xs"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
            }`}
          >
            {getLocalizedCategoryLabel(c, t, i18n.language)}
          </button>
        ))}
      </div>

      {activeTab === "wanted" ? (
        wantedLoading ? (
          <div className="flex flex-col gap-6 text-sm text-[var(--muted)]">
            {t("common.loading")}
          </div>
        ) : wantedError ? (
          <EmptyState title={t("common.error")} description={wantedError} />
        ) : filteredWantedPosts.length ? (
          <section className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedWantedPosts.map((post) => {
              const dateRange =
                post.neededFrom || post.neededUntil
                  ? `${formatShortDate(post.neededFrom) || "—"} – ${
                      formatShortDate(post.neededUntil) || "—"
                    }`
                  : t("wanted.flexibleDates");

              return (
                <article
                  key={post.id}
                  className="group flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--primary)]/40 transition-all duration-200 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <CategoryBadge category={post.category} />
                    <StatusBadge status={post.status} />
                  </div>
                  <Link
                    to={`/wanted/${post.id}`}
                    className="mt-2.5 text-[15px] font-semibold text-[var(--text)] hover:text-[var(--primary)] no-underline leading-snug line-clamp-2 transition-colors"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1.5 mb-0 text-[12.5px] text-[var(--muted)] line-clamp-2 leading-relaxed flex-1">
                    {post.description || t("wanted.noDescription")}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--muted)]">
                    <Calendar size={13} className="shrink-0 text-[var(--primary)]" />
                    <span>{dateRange}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <Avatar name={post.requesterName} size="xs" />
                    <span className="truncate" title={post.requesterName}>
                      {post.requesterName}
                    </span>
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2.5">
                    <span className="text-[11px] font-medium text-[var(--muted)]">
                      {t("wanted.pendingOffersCount", {
                        count: post.pendingOfferCount || 0,
                      })}
                    </span>
                    <Link to={`/wanted/${post.id}`} className="text-link">
                      {t("wanted.viewDetails")} <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <EmptyState
            title={t("wanted.emptyTitle")}
            description={t("wanted.emptyDesc")}
          />
        )
      ) : availableItems.length ? (
        <section className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </section>
      ) : (
        <EmptyState
          title={t("browse.emptyTitle")}
          description={t("browse.emptyDesc")}
        />
      )}

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 pt-2"
          aria-label={t("browse.paginationLabel", { defaultValue: "เปลี่ยนหน้า" })}
        >
          <span className="text-xs text-[var(--muted)]">
            {t("browse.pageInfo", {
              page: safePage,
              total: totalPages,
              defaultValue: `หน้า ${safePage} จาก ${totalPages}`,
            })}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="button button-outline button-sm"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label={t("browse.prevPage", { defaultValue: "ก่อนหน้า" })}
            >
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">
                {t("browse.prevPage", { defaultValue: "ก่อนหน้า" })}
              </span>
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                aria-current={pageNum === safePage ? "page" : undefined}
                className={`w-8 h-8 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                  pageNum === safePage
                    ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-xs"
                    : "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)]"
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              className="button button-outline button-sm"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label={t("browse.nextPage", { defaultValue: "ถัดไป" })}
            >
              <span className="hidden sm:inline">
                {t("browse.nextPage", { defaultValue: "ถัดไป" })}
              </span>
              <ChevronRight size={15} />
            </button>
          </div>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[var(--surface-tint)] border border-[var(--border)] rounded-[14px]">
        <div>
          <strong className="block text-base font-semibold text-[var(--text)]">
            {activeTab === "wanted"
              ? t("wanted.createCtaTitle")
              : t("browse.ctaTitle")}
          </strong>
          <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">
            {activeTab === "wanted"
              ? t("wanted.createCtaDesc")
              : t("browse.ctaDesc")}
          </p>
        </div>
        <Link
          to={activeTab === "wanted" ? "/create?tab=wanted" : "/create"}
          className="button button-primary shrink-0"
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
