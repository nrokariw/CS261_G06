import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Trash2,
  Plus,
  PackageOpen,
  Search,
  AlertCircle,
  HandHeart,
  ArrowRight,
} from "lucide-react";
import { PageHeading, StatusBadge, EmptyState } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { getCategoryLabel, normalizeCategoryKey } from "../data";
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
    <div className="page-stack">
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

      {notice && (
        <div className="alert alert-success">
          {notice}
          <button onClick={() => setNotice("")} className="alert-close">
            {t("myListings.closeAlert")}
          </button>
        </div>
      )}
      {errorNotice && (
        <div className="alert alert-error" style={{ background: "#FCE8E4", color: "#B9382B" }}>
          <AlertCircle size={17} />
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice("")} className="alert-close">
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
        <span className="result-count">
          {activeTab === "wanted"
            ? t("wanted.resultCount", { count: filteredWanted.length })
            : t("myListings.resultCount", { count: mine.length })}
        </span>
      </div>

      {activeTab === "wanted" ? (
        wantedLoading ? (
          <div className="card">
            <p>{t("common.loading")}</p>
          </div>
        ) : filteredWanted.length ? (
          <div className="my-listings-list">
            {filteredWanted.map((post) => {
              const categoryKey = normalizeCategoryKey(post.category);
              const categoryLabel = t(`categories.${categoryKey}`, {
                defaultValue: getCategoryLabel(post.category),
              });
              const isOpen = String(post.status).toLowerCase() === "open";
              return (
                <article className="listing-row listing-row-no-thumb" key={post.id}>
                  <div className="listing-details">
                    <span className="category-label">{categoryLabel}</span>
                    <h3>
                      <Link to={`/wanted/${post.id}`}>{post.title}</Link>
                    </h3>
                    <p>{post.description || t("wanted.noDescription")}</p>
                    <div className="wanted-my-item-badges">
                      <StatusBadge status={post.status} />
                      <span className="chip">
                        {t("wanted.pendingOffersCount", {
                          count: post.pendingOfferCount || 0,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="listing-actions">
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
                  {cancelWantedId === post.id && (
                    <div className="delete-confirm">
                      <strong>
                        {t("myListings.confirmDeleteTitle", { name: post.title })}
                      </strong>
                      <span>{t("myListings.confirmDeleteDesc")}</span>
                      <div>
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
