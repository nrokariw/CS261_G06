import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  HandHeart,
  Package,
  Pencil,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { getCategoryLabel } from "../data";
import { EmptyState, PageHeading } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { BORROW_REASON_MAX_LENGTH } from "../constants/config";
import {
  acceptLendOffer,
  cancelWantedPost,
  createLendOffer,
  getWantedPost,
  rejectLendOffer,
} from "../api/wantedPostsApi";
import { getAvailableItems } from "../api/itemsApi";

function formatDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(locale === "en" ? "en-US" : "th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WantedPostDetails({ items = [], onItemsRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t, i18n } = useTranslation();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [borrowRequestId, setBorrowRequestId] = useState(null);

  const [availableItems, setAvailableItems] = useState(items);
  const [offeredItemId, setOfferedItemId] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWantedPost(id, token);
      setPost(data);
    } catch (err) {
      setError(err.message || t("wanted.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, token, t]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    if (items && items.length > 0) {
      setAvailableItems(items);
      return;
    }
    if (!token) return;
    getAvailableItems(token)
      .then((list) => {
        if (Array.isArray(list)) setAvailableItems(list);
      })
      .catch(() => {});
  }, [items, token]);

  const isOwner = Boolean(
    user && post && String(user.id) === String(post.requesterId)
  );

  const myAvailableItems = useMemo(() => {
    if (!user) return [];
    return (availableItems || []).filter(
      (item) =>
        String(item.ownerId) === String(user.id) &&
        String(item.status || "").toLowerCase() === "available"
    );
  }, [availableItems, user]);

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    setError(null);
    setActionMsg(null);

    if (!offeredItemId && !offerMessage.trim()) {
      setError(t("wanted.offerValidation"));
      return;
    }

    setSubmittingOffer(true);
    try {
      await createLendOffer(
        post.id,
        {
          offeredItemId: offeredItemId ? Number(offeredItemId) : null,
          message: offerMessage.trim() || null,
        },
        token
      );
      setOfferedItemId("");
      setOfferMessage("");
      setActionMsg(t("wanted.offerCreated"));
      await loadPost();
    } catch (err) {
      setError(err.message || t("wanted.offerError"));
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    setError(null);
    setActionMsg(null);
    setProcessingOfferId(offerId);
    try {
      const res = await acceptLendOffer(post.id, offerId, token);
      if (res?.borrowRequestId) {
        setBorrowRequestId(res.borrowRequestId);
      }
      setActionMsg(t("wanted.offerAccepted"));
      await loadPost();
      if (typeof onItemsRefresh === "function") {
        onItemsRefresh();
      }
    } catch (err) {
      setError(err.message || t("wanted.offerActionError"));
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId) => {
    setError(null);
    setActionMsg(null);
    setProcessingOfferId(offerId);
    try {
      await rejectLendOffer(post.id, offerId, token);
      setActionMsg(t("wanted.offerRejected"));
      await loadPost();
    } catch (err) {
      setError(err.message || t("wanted.offerActionError"));
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleCancelPost = async () => {
    setError(null);
    setCancelling(true);
    try {
      await cancelWantedPost(post.id, token);
      navigate("/?tab=wanted");
    } catch (err) {
      setError(err.message || t("wanted.cancelError"));
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="page-stack">
        <div className="card">
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-stack">
        <EmptyState
          title={t("wanted.notFoundTitle")}
          description={error || t("wanted.notFoundDesc")}
          action={
            <Link to="/?tab=wanted" className="button button-primary">
              {t("wanted.backToList")}
            </Link>
          }
        />
      </div>
    );
  }

  const offers = Array.isArray(post.offers) ? post.offers : [];
  const isOpen = String(post.status).toLowerCase() === "open";

  return (
    <div className="page-stack">
      <div className="back-link-row">
        <Link to="/?tab=wanted" className="button button-outline button-sm">
          <ArrowLeft size={16} /> {t("wanted.backToList")}
        </Link>
      </div>

      <PageHeading
        eyebrow={t(`categories.${post.category}`, {
          defaultValue: getCategoryLabel(post.category),
        })}
        title={post.title}
        subtitle={t("wanted.postedBy", {
          name: post.requesterName || t("common.unknown"),
        })}
        action={
          <span className={`status-badge status-${post.status}`}>
            {t(`wanted.status.${post.status}`, post.status)}
          </span>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {actionMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{actionMsg}</span>
          {borrowRequestId && (
            <Link to="/my-borrows" className="button button-primary button-sm">
              {t("wanted.goToMyBorrows")}
            </Link>
          )}
        </div>
      )}

      <div className="card wanted-detail-card">
        <div className="wanted-meta-grid">
          <div className="wanted-meta-item">
            <User size={16} />
            <div>
              <small>{t("wanted.requesterLabel")}</small>
              <strong>{post.requesterName || "—"}</strong>
              {post.requesterFaculty && <span>{post.requesterFaculty}</span>}
            </div>
          </div>
          <div className="wanted-meta-item">
            <Calendar size={16} />
            <div>
              <small>{t("wanted.neededDatesLabel")}</small>
              <strong>
                {post.neededFrom || post.neededUntil
                  ? `${formatDate(post.neededFrom, i18n.language)} — ${formatDate(
                      post.neededUntil,
                      i18n.language
                    )}`
                  : t("wanted.flexibleDates")}
              </strong>
            </div>
          </div>
        </div>

        <div className="wanted-description-block">
          <h3>{t("wanted.descriptionLabel")}</h3>
          <p>{post.description || t("wanted.noDescription")}</p>
        </div>

        {isOwner && isOpen && (
          <div className="form-actions">
            <Link
              to={`/create?tab=wanted&edit=${post.id}`}
              className="button button-outline button-sm"
            >
              <Pencil size={15} /> {t("wanted.editButton")}
            </Link>
            <button
              type="button"
              className="button button-outline button-sm"
              onClick={handleCancelPost}
              disabled={cancelling}
            >
              <Trash2 size={15} />{" "}
              {cancelling ? t("common.saving") : t("wanted.cancelButton")}
            </button>
          </div>
        )}
      </div>

      {/* Lender Offer Form (for non-owners when post is open) */}
      {!isOwner && isOpen && (
        <div className="card">
          <h3>
            <HandHeart size={18} /> {t("wanted.offerFormTitle")}
          </h3>
          {!user ? (
            <div className="wanted-login-prompt">
              <p>{t("wanted.loginToOffer")}</p>
              <Link to="/login" className="button button-primary button-sm">
                {t("auth.loginButton")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmitOffer} className="wanted-offer-form">
              <div className="form-group">
                <label htmlFor="offer-item">{t("wanted.selectItemLabel")}</label>
                <select
                  id="offer-item"
                  className="input"
                  value={offeredItemId}
                  onChange={(e) => setOfferedItemId(e.target.value)}
                >
                  <option value="">{t("wanted.selectItemPlaceholder")}</option>
                  {myAvailableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} (
                      {t(`categories.${item.category}`, {
                        defaultValue: getCategoryLabel(item.category),
                      })}
                      )
                    </option>
                  ))}
                </select>
                {myAvailableItems.length === 0 && (
                  <span className="field-hint">
                    {t("wanted.noAvailableItemsHint")}{" "}
                    <Link to="/create">{t("nav.create")}</Link>
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="offer-message">
                  {t("wanted.offerMessageLabel")}
                </label>
                <textarea
                  id="offer-message"
                  className="input"
                  rows={3}
                  maxLength={BORROW_REASON_MAX_LENGTH}
                  placeholder={t("wanted.offerMessagePlaceholder")}
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={submittingOffer}
                >
                  {submittingOffer
                    ? t("common.saving")
                    : t("wanted.submitOfferButton")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Offers List (visible to owner and lenders who submitted an offer) */}
      {user && (isOwner || offers.length > 0) && (
        <div className="card">
          <h3>
            {isOwner
              ? t("wanted.incomingOffersTitle", { count: offers.length })
              : t("wanted.myOffersTitle")}
          </h3>
          {offers.length === 0 ? (
            <p className="field-hint">{t("wanted.noOffersYet")}</p>
          ) : (
            <div className="wanted-offers-list">
              {offers.map((offer) => {
                const isPending =
                  String(offer.status).toLowerCase() === "pending";
                return (
                  <div key={offer.id} className="wanted-offer-card">
                    <div className="wanted-offer-header">
                      <div>
                        <strong>{offer.lenderName}</strong>
                        {offer.offeredItemTitle && (
                          <div className="wanted-offer-item">
                            <Package size={14} />{" "}
                            <Link to={`/items/${offer.offeredItemId}`}>
                              {offer.offeredItemTitle}
                            </Link>
                          </div>
                        )}
                      </div>
                      <span className={`status-badge status-${offer.status}`}>
                        {t(`wanted.offerStatus.${offer.status}`, offer.status)}
                      </span>
                    </div>

                    {offer.message && (
                      <p className="wanted-offer-message">{offer.message}</p>
                    )}

                    {isOwner && isOpen && isPending && (
                      <div className="wanted-offer-actions">
                        <button
                          type="button"
                          className="button button-primary button-sm"
                          disabled={processingOfferId === offer.id}
                          onClick={() => handleAcceptOffer(offer.id)}
                        >
                          <CheckCircle2 size={15} /> {t("wanted.acceptOffer")}
                        </button>
                        <button
                          type="button"
                          className="button button-outline button-sm"
                          disabled={processingOfferId === offer.id}
                          onClick={() => handleRejectOffer(offer.id)}
                        >
                          <XCircle size={15} /> {t("wanted.rejectOffer")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
