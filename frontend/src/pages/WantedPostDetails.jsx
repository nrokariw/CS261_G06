import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  HandHeart,
  LogIn,
  Package,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { getCategoryLabel, normalizeCategoryKey } from "../data";
import { Avatar, EmptyState, StatusBadge } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { BORROW_REASON_MAX_LENGTH } from "../constants/config";
import {
  acceptLendOffer,
  cancelWantedPost,
  createLendOffer,
  getWantedPost,
  rejectLendOffer,
} from "../api/wantedPostsApi";
import { getAllItems, getAvailableItems } from "../api/itemsApi";
import { getBorrowRequests, normalizeBorrowRequest } from "../api/requestsApi";

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

export default function WantedPostDetails({
  items = [],
  setItems,
  setRequests,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { t, i18n } = useTranslation();

  const authToken = token || user?.token;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [borrowRequestId, setBorrowRequestId] = useState(null);

  const [fallbackItems, setFallbackItems] = useState([]);
  const [offeredItemId, setOfferedItemId] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerFieldError, setOfferFieldError] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWantedPost(id, authToken);
      setPost(data);
    } catch (err) {
      setError(err.message || t("wanted.loadError"));
    } finally {
      setLoading(false);
    }
  }, [id, authToken, t]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    if (items && items.length > 0) return;
    getAllItems(authToken)
      .catch(() => getAvailableItems("AVAILABLE", authToken))
      .then((list) => {
        if (Array.isArray(list)) setFallbackItems(list);
      })
      .catch(() => {});
  }, [items, authToken]);

  const effectiveItems = items && items.length > 0 ? items : fallbackItems;

  const isOwner = Boolean(
    user &&
      post &&
      ((user.studentId &&
        String(user.studentId) === String(post.requesterId)) ||
        (user.id && String(user.id) === String(post.requesterId)))
  );

  const myAvailableItems = useMemo(() => {
    if (!user) return [];
    return (effectiveItems || []).filter((item) => {
      const matchesOwner = item.ownerId
        ? String(item.ownerId) === String(user.id || "") ||
          String(item.ownerId) === String(user.studentId || "")
        : Boolean(user.name && item.owner === user.name);
      return (
        matchesOwner &&
        String(item.status || "").toLowerCase() === "available"
      );
    });
  }, [effectiveItems, user]);

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    setError(null);
    setActionMsg(null);
    setOfferFieldError("");

    if (!offeredItemId) {
      setOfferFieldError(t("wanted.offerValidation"));
      return;
    }

    setSubmittingOffer(true);
    try {
      await createLendOffer(
        post.id,
        {
          offeredItemId: String(offeredItemId),
          message: offerMessage.trim() || null,
        },
        authToken
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
      const res = await acceptLendOffer(post.id, offerId, authToken);
      if (res?.borrowRequestId) {
        setBorrowRequestId(res.borrowRequestId);
      }

      const acceptedItemId = res?.acceptedOffer?.offeredItemId;
      let nextItems = effectiveItems;
      if (acceptedItemId) {
        nextItems = effectiveItems.map((it) =>
          String(it.id) === String(acceptedItemId)
            ? { ...it, status: "reserved" }
            : it
        );
        if (typeof setItems === "function") {
          setItems((prev) =>
            prev.map((it) =>
              String(it.id) === String(acceptedItemId)
                ? { ...it, status: "reserved" }
                : it
            )
          );
        }
      }

      if (typeof setRequests === "function") {
        let refreshed = null;
        try {
          refreshed = await getBorrowRequests(user, authToken, nextItems);
        } catch {
          refreshed = null;
        }
        if (Array.isArray(refreshed) && refreshed.length > 0) {
          setRequests(refreshed);
        } else if (res?.borrowRequest) {
          const normalized = normalizeBorrowRequest(
            res.borrowRequest,
            nextItems
          );
          if (normalized) {
            setRequests((prev) => [
              normalized,
              ...(prev || []).filter((r) => String(r.id) !== String(normalized.id)),
            ]);
          }
        }
      }

      setActionMsg(t("wanted.offerAccepted"));
      await loadPost();
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
      await rejectLendOffer(post.id, offerId, authToken);
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
      await cancelWantedPost(post.id, authToken);
      navigate("/my-listings?tab=wanted");
    } catch (err) {
      setError(err.message || t("wanted.cancelError"));
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="page-stack">
        <div className="detail-main">
          <div className="detail-info">
            <p>{t("common.loading")}</p>
          </div>
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
        />
        <div>
          <Link to="/?tab=wanted" className="button button-primary">
            <ArrowLeft size={16} /> {t("wanted.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  const offers = Array.isArray(post.offers) ? post.offers : [];
  const isOpen = String(post.status).toLowerCase() === "open";
  const categoryKey = normalizeCategoryKey(post.category);
  const categoryLabel = t(`categories.${categoryKey}`, {
    defaultValue: getCategoryLabel(post.category),
  });

  const dateText =
    post.neededFrom || post.neededUntil
      ? `${formatDate(post.neededFrom, i18n.language)} — ${formatDate(
          post.neededUntil,
          i18n.language
        )}`
      : t("wanted.flexibleDates");

  return (
    <div className="page-stack">
      <div className="detail-page-heading">
        <div className="eyebrow">{t("wanted.eyebrow")}</div>
      </div>
      <button
        type="button"
        className="back-link"
        onClick={() => navigate("/?tab=wanted")}
      >
        <ArrowLeft size={16} /> {t("wanted.backToList")}
      </button>

      {error && (
        <div className="alert alert-error wanted-alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {actionMsg && (
        <div className="alert alert-success wanted-alert-success">
          <CheckCircle2 size={18} />
          <span>{actionMsg}</span>
          {borrowRequestId && (
            <Link
              to="/my-borrows"
              className="button button-primary button-sm wanted-alert-action"
            >
              {t("wanted.goToMyBorrows")}
            </Link>
          )}
        </div>
      )}

      <div className="detail-layout">
        <section className="detail-main">
          <div className="detail-info">
            <div className="wanted-detail-badges">
              <StatusBadge status={post.status} />
              <span className="category-label">{categoryLabel}</span>
            </div>
            <h1>{post.title}</h1>
            <div className="owner-row">
              <span className="owner-avatar avatar">
                <UserRound size={20} />
              </span>
              <div>
                <strong>{post.requesterName || "—"}</strong>
                <small>{post.requesterFaculty || t("wanted.requesterLabel")}</small>
              </div>
              <span className="verified">
                <ShieldCheck size={15} /> {t("itemDetails.verifiedMember")}
              </span>
            </div>

            <hr />

            <h2>{t("wanted.descriptionLabel")}</h2>
            <p>{post.description || t("wanted.noDescription")}</p>

            <div className="wanted-date-pill">
              <CalendarDays size={16} />
              <span>
                {t("wanted.neededDatesLabel")}: {dateText}
              </span>
            </div>

            {isOwner && isOpen && (
              <div className="wanted-owner-actions">
                <Link
                  to={`/create?tab=wanted&edit=${post.id}`}
                  className="button button-outline button-sm"
                >
                  <Pencil size={15} /> {t("wanted.editButton")}
                </Link>
                <button
                  type="button"
                  className="button button-danger-outline button-sm"
                  onClick={handleCancelPost}
                  disabled={cancelling}
                >
                  <Trash2 size={15} />{" "}
                  {cancelling ? t("common.saving") : t("wanted.cancelButton")}
                </button>
              </div>
            )}
          </div>

          {user && (isOwner || offers.length > 0) && (
            <div className="wanted-offers-section">
              <div className="wanted-offers-heading">
                <h2>
                  {isOwner
                    ? t("wanted.incomingOffersTitle", { count: offers.length })
                    : t("wanted.myOffersTitle")}
                </h2>
              </div>
              {offers.length === 0 ? (
                <p className="wanted-empty-hint">{t("wanted.noOffersYet")}</p>
              ) : (
                <div className="wanted-offers-list">
                  {offers.map((offer) => {
                    const isPending =
                      String(offer.status).toLowerCase() === "pending";
                    return (
                      <article key={offer.id} className="wanted-offer-card">
                        <div className="wanted-offer-header">
                          <div className="wanted-offer-lender">
                            <Avatar name={offer.lenderName} size="sm" />
                            <div>
                              <strong>{offer.lenderName}</strong>
                              {offer.offeredItemTitle && (
                                <div className="wanted-offer-item">
                                  <Package size={14} />
                                  <Link to={`/items/${offer.offeredItemId}`}>
                                    {offer.offeredItemTitle}
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={offer.status} />
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
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="borrow-panel">
          <div className="borrow-panel-heading">
            <span className="panel-icon">
              <HandHeart size={20} />
            </span>
            <div>
              <h2>
                {isOwner
                  ? t("wanted.ownerPanelTitle")
                  : t("wanted.offerFormTitle")}
              </h2>
              <p>
                {isOwner
                  ? t("wanted.ownerPanelDesc")
                  : t("wanted.offerFormSubtitle")}
              </p>
            </div>
          </div>

          {!user ? (
            <div className="wanted-panel-stack">
              <div className="borrow-note borrow-note-flush">
                <ShieldCheck size={17} />
                <span>{t("wanted.loginToOffer")}</span>
              </div>
              <Link
                to="/login"
                state={{ from: location }}
                className="button button-primary button-full"
              >
                <LogIn size={16} /> {t("nav.login")}
              </Link>
            </div>
          ) : isOwner ? (
            <div className="wanted-panel-stack">
              <div className="borrow-note borrow-note-flush">
                <ShieldCheck size={17} />
                <span>
                  {String(post.status).toLowerCase() === "fulfilled"
                    ? t("wanted.offerAccepted")
                    : t("wanted.incomingOffersTitle", { count: offers.length })}
                </span>
              </div>
              {String(post.status).toLowerCase() === "fulfilled" && (
                <Link
                  to="/my-borrows"
                  className="button button-primary button-full"
                >
                  {t("wanted.goToMyBorrows")}
                </Link>
              )}
            </div>
          ) : !isOpen ? (
            <div className="borrow-note borrow-note-flush">
              <AlertCircle size={17} />
              <span>{t(`status.${post.status}`, post.status)}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitOffer} noValidate>
              <div className="field">
                <label htmlFor="offer-item">
                  {t("wanted.selectItemLabel")} <span className="required">*</span>
                </label>
                <select
                  id="offer-item"
                  value={offeredItemId}
                  onChange={(e) => {
                    setOfferedItemId(e.target.value);
                    if (offerFieldError) setOfferFieldError("");
                  }}
                  aria-invalid={!!offerFieldError}
                  disabled={myAvailableItems.length === 0}
                >
                  <option value="">{t("wanted.selectItemPlaceholder")}</option>
                  {myAvailableItems.map((item) => {
                    const catKey = normalizeCategoryKey(item.category);
                    const catLabel = t(`categories.${catKey}`, {
                      defaultValue: getCategoryLabel(item.category),
                    });
                    const itemLabel = item.name || item.title || item.id;
                    return (
                      <option key={item.id} value={item.id}>
                        {itemLabel} ({catLabel})
                      </option>
                    );
                  })}
                </select>
                {offerFieldError && (
                  <small className="field-error">
                    <AlertCircle size={13} />
                    {offerFieldError}
                  </small>
                )}
                {myAvailableItems.length === 0 && (
                  <div className="wanted-no-items-callout">
                    <span>{t("wanted.noAvailableItemsHint")}</span>
                    <Link
                      to="/create"
                      className="button button-outline button-sm"
                    >
                      {t("nav.create")}
                    </Link>
                  </div>
                )}
              </div>

              <div className="field">
                <label htmlFor="offer-message">
                  {t("wanted.offerMessageLabel")}
                </label>
                <textarea
                  id="offer-message"
                  rows={4}
                  maxLength={BORROW_REASON_MAX_LENGTH}
                  placeholder={t("wanted.offerMessagePlaceholder")}
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                />
                <small className="helper-text">
                  {offerMessage.length}/{BORROW_REASON_MAX_LENGTH}
                </small>
              </div>

              <div className="borrow-note">
                <ShieldCheck size={17} />
                <span>{t("wanted.offerNote")}</span>
              </div>

              <button
                type="submit"
                className="button button-primary button-full"
                disabled={submittingOffer || myAvailableItems.length === 0}
              >
                <Send size={16} />{" "}
                {submittingOffer
                  ? t("common.saving")
                  : t("wanted.submitOfferButton")}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
