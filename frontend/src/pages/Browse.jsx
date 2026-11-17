import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { getActiveCategoryCodes, normalizeCategoryKey } from "../data";
import { ItemCard, PageHeading, EmptyState, getLocalizedCategoryLabel } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { getAvailableItems } from "../api/itemsApi";
import { ITEMS_PER_PAGE } from "../constants/config";

export default function Browse({
  items: propItems,
  requests = [],
  categories: propCategories,
  loading: propLoading,
}) {
  const { user, token } = useAuth();
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

  useEffect(() => {
    setCurrentPage(1);
  }, [query, category]);

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

  const totalPages = Math.max(1, Math.ceil(availableItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return availableItems.slice(start, start + ITEMS_PER_PAGE);
  }, [availableItems, safePage]);

  if (isLoading) return <div className="flex flex-col gap-6 text-sm text-[var(--muted)]">{t("common.loading", { defaultValue: "กำลังโหลดข้อมูล..." })}</div>;
  if (error) return <div className="flex flex-col gap-6"><EmptyState title={t("common.error", { defaultValue: "เกิดข้อผิดพลาด" })} description={error} /></div>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t("browse.eyebrow")}
        title={t("browse.title")}
        subtitle={t("browse.subtitle")}
        action={
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[var(--surface-tint)] border border-[var(--border)] text-xs font-semibold text-[var(--text)]">
            {t("browse.resultCount", { count: availableItems.length })}
          </span>
        }
      />
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
      {availableItems.length ? (
        <>
          <section className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </section>
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
        </>
      ) : (
        <EmptyState
          title={t("browse.emptyTitle")}
          description={t("browse.emptyDesc")}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[var(--surface-tint)] border border-[var(--border)] rounded-[14px]">
        <div>
          <strong className="block text-base font-semibold text-[var(--text)]">
            {t("browse.ctaTitle")}
          </strong>
          <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">
            {t("browse.ctaDesc")}
          </p>
        </div>
        <Link to="/create" className="button button-primary shrink-0">
          <Plus size={17} /> {t("browse.ctaButton")}
        </Link>
      </div>
    </div>
  );
}
