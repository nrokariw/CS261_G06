import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Plus, PackageOpen, Search } from "lucide-react";
import { PageHeading, StatusBadge, EmptyState } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { getCategoryLabel, normalizeCategoryKey } from "../data";

export default function MyListings({ items, setItems }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState("");
  const mine = items.filter(
    (item) =>
      (item.ownerId ? item.ownerId === user.id : item.owner === user.name) &&
      item.status !== "deleted" &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  );

  function removeItem(id) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "deleted" } : item,
      ),
    );
    setDeleteId(null);
    setNotice(t("myListings.deletedNotice"));
  }

  return (
    <div className="page-stack">
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
      {notice && (
        <div className="alert alert-success">
          {notice}
          <button onClick={() => setNotice("")} className="alert-close">
            {t("myListings.closeAlert")}
          </button>
        </div>
      )}

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("myListings.searchPlaceholder")}
          />
        </label>
        <span className="result-count">{t("myListings.resultCount", { count: mine.length })}</span>
      </div>

      {mine.length ? (
        <div className="my-listings-list">
          {mine.map((item) => {
            const categoryKey = normalizeCategoryKey(item.category);
            const categoryLabel = t(`categories.${categoryKey}`, {
              defaultValue: getCategoryLabel(item.category),
            });
            return (
              <article className="listing-row" key={item.id}>
                {item.image ? (
                  <img
                    className="listing-thumb"
                    src={item.image}
                    alt={item.name}
                  />
                ) : (
                  <div className="listing-thumb image-placeholder">
                    <PackageOpen size={30} />
                  </div>
                )}
                <div className="listing-details">
                  <span className="category-label">{categoryLabel}</span>
                  <h3>{item.name}</h3>
                  <p>{item.detail}</p>
                  <StatusBadge status={item.status} />
                </div>

                <div className="listing-actions">
                  <Link
                    className="button button-outline button-sm"
                    to={`/create?edit=${item.id}`}
                  >
                    <Pencil size={15} /> {t("myListings.edit")}
                  </Link>
                  <button
                    className="button button-danger-outline button-sm"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 size={15} /> {t("myListings.delete")}
                  </button>
                </div>
                {deleteId === item.id && (
                  <div className="delete-confirm">
                    <strong>{t("myListings.confirmDeleteTitle", { name: item.name })}</strong>
                    <span>{t("myListings.confirmDeleteDesc")}</span>
                    <div>
                      <button
                        className="button button-danger button-sm"
                        onClick={() => removeItem(item.id)}
                      >
                        {t("myListings.confirmDeleteBtn")}
                      </button>
                      <button
                        className="button button-outline button-sm"
                        onClick={() => setDeleteId(null)}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
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
