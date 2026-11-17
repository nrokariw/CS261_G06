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
  XCircle,
} from "lucide-react";
import {
  Avatar,
  CategoryBadge,
  EmptyState,
  StatusBadge,
  getLocalizedCategoryLabel,
} from "../components/UI";
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
      <div className="flex flex-col gap-6 text-sm text-[var(--muted)]">
        {t("common.loading")}
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col gap-6">
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

  const dateText =
    post.neededFrom || post.neededUntil
      ? `${formatDate(post.neededFrom, i18n.language)} — ${formatDate(
          post.neededUntil,
          i18n.language
        )}`
      : t("wanted.flexibleDates");

  return (
    <div className="flex flex-col gap-5">
      <div>
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
        <div className="alert alert-error">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {actionMsg && (
        <div className="alert alert-success flex-wrap">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{actionMsg}</span>
          {borrowRequestId && (
            <Link
              to="/my-borrows"
              className="button button-primary button-sm ml-auto"
            >
              {t("wanted.goToMyBorrows")}
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)] gap-7 items-start">
        <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-6 sm:p-7 flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={post.status} />
              <CategoryBadge category={post.category} />
            </div>
            <h1 className="mt-3 mb-0 text-2xl sm:text-[26px] font-bold leading-snug text-[var(--text)]">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)]">
              <Avatar name={post.requesterName || "—"} size="md" />
              <div className="min-w-0 flex-1 flex flex-col">
                <strong className="text-sm font-semibold text-[var(--text)] truncate">
                  {post.requesterName || "—"}
                </strong>
                <small className="text-[11px] text-[var(--muted)] truncate">
                  {post.requesterFaculty || t("wanted.requesterLabel")}
                </small>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E4F3E8] text-[#247A4B] dark:bg-[#1B3526] dark:text-[#4ADE80] text-[11px] font-semibold shrink-0">
                <ShieldCheck size={14} /> {t("itemDetails.verifiedMember")}
              </span>
            </div>

            <hr className="my-5 border-0 border-t border-[var(--border)]" />

            <h2 className="m-0 text-[15px] font-semibold text-[var(--text)]">
              {t("wanted.descriptionLabel")}
            </h2>
            <p className="mt-2 mb-0 text-[13.5px] leading-relaxed text-[var(--muted)] whitespace-pre-line">
              {post.description || t("wanted.noDescription")}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-tint)] border border-[var(--border)] text-xs font-medium text-[var(--text)] w-fit">
              <CalendarDays size={15} className="text-[var(--primary)] shrink-0" />
              <span>
                {t("wanted.neededDatesLabel")}: {dateText}
              </span>
            </div>

            {isOwner && isOpen && (
              <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-2.5">
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
            <div className="px-6 sm:px-7 py-5 border-t border-[var(--border)] bg-[var(--surface-subtle)]/50">
              <h2 className="m-0 mb-3.5 text-base font-semibold text-[var(--text)]">
                {isOwner
                  ? t("wanted.incomingOffersTitle", { count: offers.length })
                  : t("wanted.myOffersTitle")}
              </h2>
              {offers.length === 0 ? (
                <p className="m-0 text-[13px] text-[var(--muted)]">
                  {t("wanted.noOffersYet")}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {offers.map((offer) => {
                    const isPending =
                      String(offer.status).toLowerCase() === "pending";
                    return (
                      <article
                        key={offer.id}
                        className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={offer.lenderName} size="sm" />
                            <div className="min-w-0">
                              <strong className="block text-[13.5px] font-semibold text-[var(--text)] truncate">
                                {offer.lenderName}
                              </strong>
                              {offer.offeredItemTitle && (
                                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                                  <Package size={13} className="shrink-0 text-[var(--primary)]" />
                                  <Link
                                    to={`/items/${offer.offeredItemId}`}
                                    className="font-medium text-[var(--primary)] hover:underline truncate"
                                  >
                                    {offer.offeredItemTitle}
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={offer.status} />
                        </div>

                        {offer.message && (
                          <p className="m-0 text-[13px] leading-relaxed text-[var(--text)] bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg px-3 py-2">
                            {offer.message}
                          </p>
                        )}

                        {isOwner && isOpen && isPending && (
                          <div className="flex flex-wrap items-center gap-2">
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

        <aside className="lg:sticky lg:top-24 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-[var(--peach)] text-[var(--primary)] grid place-items-center shrink-0">
              <HandHeart size={20} />
            </span>
            <div>
              <h2 className="m-0 text-base font-semibold text-[var(--text)]">
                {isOwner
                  ? t("wanted.ownerPanelTitle")
                  : t("wanted.offerFormTitle")}
              </h2>
              <p className="m-0 mt-0.5 text-xs text-[var(--muted)] leading-snug">
                {isOwner
                  ? t("wanted.ownerPanelDesc")
                  : t("wanted.offerFormSubtitle")}
              </p>
            </div>
          </div>

          {!user ? (
            <div className="grid gap-3">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs leading-relaxed text-[var(--muted)]">
                <ShieldCheck size={17} className="shrink-0 mt-0.5 text-[var(--primary)]" />
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
            <div className="grid gap-3">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs leading-relaxed text-[var(--muted)]">
                <ShieldCheck size={17} className="shrink-0 mt-0.5 text-[var(--primary)]" />
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
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs leading-relaxed text-[var(--muted)]">
              <AlertCircle size={17} className="shrink-0 mt-0.5 text-[var(--primary)]" />
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
                    const catLabel = getLocalizedCategoryLabel(
                      item.category,
                      t,
                      i18n.language
                    );
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
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 rounded-[9px] bg-[var(--surface-subtle)] border border-dashed border-[var(--border)] text-xs text-[var(--muted)]">
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

              <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs leading-relaxed text-[var(--muted)]">
                <ShieldCheck size={17} className="shrink-0 mt-0.5 text-[var(--primary)]" />
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
