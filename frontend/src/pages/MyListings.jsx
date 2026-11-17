import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Trash2,
  Plus,
  PackageOpen,
  Search,
  HandHeart,
  ArrowRight,
} from "lucide-react";
import { PageHeading, StatusBadge, EmptyState, CategoryBadge, AlertBanner } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { deleteItem } from "../api/itemsApi";
import { cancelWantedPost, getMyWantedPosts } from "../api/wantedPostsApi";

export default function MyListings({ items, setItems }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [myWantedPosts, setMyWantedPosts] = useState([]);
  const [wantedLoading, setWantedLoading] = useState(false);
  const [cancelWantedId, setCancelWantedId] = useState(null);

  const activeTab = searchParams.get("tab") === "wanted" ? "wanted" : "items";
  const handleTabChange = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === "wanted") next.set("tab", "wanted");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const authToken = token || user?.token;
    if (activeTab !== "wanted" || !authToken) return;
    let cancelled = false;
    setWantedLoading(true);
    getMyWantedPosts(authToken)
      .then((list) => {
        if (!cancelled) {
          setMyWantedPosts(Array.isArray(list) ? list : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorNotice(err.message || t("wanted.loadError"));
        }
      })
      .finally(() => {
        if (!cancelled) setWantedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, token, user?.token, t]);

  const mine = items.filter(
    (item) =>
      (item.ownerId
        ? item.ownerId === user?.id || item.ownerId === user?.studentId
        : item.owner === user?.name) &&
      item.status !== "deleted" &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  );

  const filteredWanted = myWantedPosts.filter(
    (post) =>
      (post.title || "").toLowerCase().includes(query.toLowerCase()) ||
      (post.description || "").toLowerCase().includes(query.toLowerCase()),
  );

  async function removeItem(id) {
    setErrorNotice("");
    try {
      await deleteItem(id, token || user?.token);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "deleted" } : item,
        ),
      );
      setDeleteId(null);
      setNotice(t("myListings.deletedNotice"));
    } catch (err) {
      setDeleteId(null);
      setErrorNotice(err.message || t("validation.submitFailed"));
    }
  }

  async function handleCancelWanted(postId) {
    setErrorNotice("");
    try {
      await cancelWantedPost(postId, token || user?.token);
      setMyWantedPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: "cancelled" } : p)),
      );
      setCancelWantedId(null);
      setNotice(t("myListings.deletedNotice"));
    } catch (err) {
      setCancelWantedId(null);
      setErrorNotice(err.message || t("wanted.cancelError"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t("myListings.eyebrow")}
        title={t("myListings.title")}
        subtitle={t("myListings.subtitle")}
        action={
          <Link
            to={activeTab === "wanted" ? "/create?tab=wanted" : "/create"}
            className="button button-primary"
          >
            <Plus size={17} />{" "}
            {activeTab === "wanted"
              ? t("wanted.createCtaButton")
              : t("myListings.addNew")}
          </Link>
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

      <AlertBanner message={notice} onClose={() => setNotice("")} type="success" />
      <AlertBanner message={errorNotice} onClose={() => setErrorNotice("")} type="error" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex-1 flex items-center gap-2.5 px-3.5 h-11 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/15 transition-colors">
          <Search size={18} className="shrink-0" />
          <input
            className="w-full min-w-0 bg-transparent border-0 outline-none focus:outline-none text-[13px] text-[var(--text)] placeholder:text-[var(--muted)]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("myListings.searchPlaceholder")}
          />
        </label>
        <span className="inline-flex items-center self-start sm:self-auto px-3 py-1.5 rounded-full bg-[var(--surface-tint)] border border-[var(--border)] text-xs font-semibold text-[var(--text)]">
          {activeTab === "wanted"
            ? t("wanted.resultCount", { count: filteredWanted.length })
            : t("myListings.resultCount", { count: mine.length })}
        </span>
      </div>

      {activeTab === "wanted" ? (
        wantedLoading ? (
          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs text-sm text-[var(--muted)]">
            {t("common.loading")}
          </div>
        ) : filteredWanted.length ? (
          <div className="flex flex-col gap-3.5">
            {filteredWanted.map((post) => {
              const isOpen = String(post.status).toLowerCase() === "open";
              return (
                <article
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs"
                  key={post.id}
                >
                  <div className="min-w-0 flex flex-col items-start gap-1.5">
                    <CategoryBadge category={post.category} />
                    <h3 className="m-0 text-base font-semibold text-[var(--text)] truncate max-w-full">
                      <Link
                        to={`/wanted/${post.id}`}
                        className="text-inherit no-underline hover:text-[var(--primary)] transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="m-0 text-[13px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                      {post.description || t("wanted.noDescription")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <StatusBadge status={post.status} />
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border)] text-[11px] font-medium text-[var(--muted)]">
                        {t("wanted.pendingOffersCount", {
                          count: post.pendingOfferCount || 0,
                        })}
                      </span>
                    </div>
                  </div>

                  {cancelWantedId === post.id ? (
                    <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#FCE8E4] dark:bg-[#3B1C18] border border-[#F5C2B8] dark:border-[#5C2720] text-xs sm:max-w-xs">
                      <strong className="text-[#B9382B] dark:text-[#FCA5A5]">
                        {t("myListings.confirmDeleteTitle", { name: post.title })}
                      </strong>
                      <span className="text-[var(--text)] opacity-90">
                        {t("myListings.confirmDeleteDesc")}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          className="button button-danger button-sm"
                          onClick={() => handleCancelWanted(post.id)}
                        >
                          {t("wanted.cancelButton")}
                        </button>
                        <button
                          type="button"
                          className="button button-outline button-sm"
                          onClick={() => setCancelWantedId(null)}
                        >
                          {t("common.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                      <Link
                        className="button button-outline button-sm"
                        to={`/wanted/${post.id}`}
                      >
                        {t("wanted.viewDetails")} <ArrowRight size={15} />
                      </Link>
                      {isOpen && (
                        <>
                          <Link
                            className="button button-outline button-sm"
                            to={`/create?tab=wanted&edit=${post.id}`}
                          >
                            <Pencil size={15} /> {t("myListings.edit")}
                          </Link>
                          <button
                            type="button"
                            className="button button-danger-outline button-sm"
                            onClick={() => setCancelWantedId(post.id)}
                          >
                            <Trash2 size={15} /> {t("wanted.cancelButton")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={t("wanted.myWantedEmpty")}
            description={t("wanted.emptyDesc")}
          />
        )
      ) : mine.length ? (
        <div className="flex flex-col gap-3.5">
          {mine.map((item) => (
            <article
              className="grid grid-cols-1 sm:grid-cols-[96px_1fr_auto] items-center gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs"
              key={item.id}
            >
              {item.image ? (
                <img
                  className="w-full sm:w-24 h-44 sm:h-24 rounded-[10px] object-cover bg-[var(--surface-subtle)] border border-[var(--border)] shrink-0"
                  src={item.image}
                  alt={item.name}
                />
              ) : (
                <div className="w-full sm:w-24 h-44 sm:h-24 rounded-[10px] bg-[var(--surface-subtle)] border border-[var(--border)] grid place-items-center text-[var(--muted)] shrink-0">
                  <PackageOpen size={30} />
                </div>
              )}
              <div className="min-w-0 flex flex-col items-start gap-1.5">
                <CategoryBadge category={item.category} />
                <h3 className="m-0 text-base font-semibold text-[var(--text)] truncate max-w-full">
                  {item.name}
                </h3>
                <p className="m-0 text-[13px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                  {item.detail}
                </p>
                <StatusBadge status={item.status} />
              </div>

              {deleteId === item.id ? (
                <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#FCE8E4] dark:bg-[#3B1C18] border border-[#F5C2B8] dark:border-[#5C2720] text-xs sm:max-w-xs">
                  <strong className="text-[#B9382B] dark:text-[#FCA5A5]">
                    {t("myListings.confirmDeleteTitle", { name: item.name })}
                  </strong>
                  <span className="text-[var(--text)] opacity-90">
                    {t("myListings.confirmDeleteDesc")}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      className="button button-danger button-sm"
                      onClick={() => removeItem(item.id)}
                    >
                      {t("myListings.confirmDeleteBtn")}
                    </button>
                    <button
                      type="button"
                      className="button button-outline button-sm"
                      onClick={() => setDeleteId(null)}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  <Link
                    className="button button-outline button-sm"
                    to={`/create?edit=${item.id}`}
                  >
                    <Pencil size={15} /> {t("myListings.edit")}
                  </Link>
                  <button
                    type="button"
                    className="button button-danger-outline button-sm"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 size={15} /> {t("myListings.delete")}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("myListings.emptyTitle")}
          description={t("myListings.emptyDesc")}
        />
      )}
    </div>
  );
}
