import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Plus, PackageOpen, Search } from "lucide-react";
import { PageHeading, StatusBadge, EmptyState, CategoryBadge, AlertBanner } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { deleteItem } from "../api/itemsApi";

export default function MyListings({ items, setItems }) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const mine = items.filter(
    (item) =>
      (item.ownerId
        ? item.ownerId === user?.id || item.ownerId === user?.studentId
        : item.owner === user?.name) &&
      item.status !== "deleted" &&
      item.name.toLowerCase().includes(query.toLowerCase()),
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t("myListings.eyebrow")}
        title={t("myListings.title")}
        subtitle={t("myListings.subtitle")}
        action={
          <Link to="/create" className="button button-primary">
            <Plus size={17} /> {t("myListings.addNew")}
          </Link>
        }
      />
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
          {t("myListings.resultCount", { count: mine.length })}
        </span>
      </div>

      {mine.length ? (
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
