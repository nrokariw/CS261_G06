import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Check,
  X,
  AlertCircle,
  PackageCheck,
  MessageSquare,
  History,
  HandHeart,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  PageHeading,
  EmptyState,
  RequestCard,
  AlertBanner,
  CategoryBadge,
  StatusBadge,
  Avatar,
} from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import HandoverModal, { isHandedOver, isReturned } from "../components/HandoverModal";
import ReturnModal from "../components/ReturnModal";
import LoanEvidenceTimelineModal from "../components/LoanEvidenceTimelineModal";
import {
  updateBorrowRequestStatus,
  cancelBorrowRequest,
  respondToBorrowRequest,
} from "../api/requestsApi";
import { normalizeBorrowRequest } from "../api/requestsApi";
import {
  acceptLendOffer,
  getMyWantedPosts,
  getWantedPost,
  rejectLendOffer,
} from "../api/wantedPostsApi";

export default function IncomingRequests({
  requests = [],
  setRequests,
  setItems,
  items = [],
  myWantedPosts = [],
  setMyWantedPosts,
}) {
  const { user, token } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "offers" ? "offers" : "requests";
  const [actionError, setActionError] = useState("");
  // T-6.3: คำขอที่กำลังเปิดโมดอลบันทึกหลักฐานการส่งมอบ + ข้อความแจ้งผลสำเร็จ
  const [handoverReq, setHandoverReq] = useState(null);
  const [evidenceRequestId, setEvidenceRequestId] = useState(null);
  const [returnReq, setReturnReq] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [activeResponseReq, setActiveResponseReq] = useState(null);
  const [responseReason, setResponseReason] = useState("");
  const [modalError, setModalError] = useState("");
  const [offerItems, setOfferItems] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [busyOfferId, setBusyOfferId] = useState(null);

  const handleTabChange = (nextTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === "offers") next.set("tab", "offers");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const pendingOffersCount = useMemo(
    () =>
      myWantedPosts.reduce(
        (sum, post) => sum + Number(post?.pendingOfferCount || 0),
        0,
      ),
    [myWantedPosts],
  );

  useEffect(() => {
    const authToken = token || user?.token;
    if (activeTab !== "offers" || !authToken) return;

    let cancelled = false;
    async function loadInboxOffers() {
      setOffersLoading(true);
      setActionError("");
      try {
        const posts =
          myWantedPosts.length > 0
            ? myWantedPosts
            : await getMyWantedPosts(authToken);
        if (cancelled) return;
        const postList = Array.isArray(posts) ? posts : [];
        if (myWantedPosts.length === 0 && setMyWantedPosts) {
          setMyWantedPosts(postList);
        }

        const details = await Promise.all(
          postList.map((post) => getWantedPost(post.id, authToken).catch(() => null)),
        );
        if (cancelled) return;

        const flattened = [];
        for (const detail of details) {
          if (!detail || !Array.isArray(detail.offers)) continue;
          for (const offer of detail.offers) {
            flattened.push({
              ...offer,
              postId: detail.id,
              postTitle: detail.title,
              postCategory: detail.category,
              postStatus: detail.status,
            });
          }
        }
        flattened.sort((a, b) => {
          const aPending = String(a.status).toLowerCase() === "pending" ? 0 : 1;
          const bPending = String(b.status).toLowerCase() === "pending" ? 0 : 1;
          if (aPending !== bPending) return aPending - bPending;
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        });
        setOfferItems(flattened);
      } catch (err) {
        if (!cancelled) {
          setActionError(err.message || t("wanted.loadError"));
        }
      } finally {
        if (!cancelled) setOffersLoading(false);
      }
    }
    loadInboxOffers();
    return () => {
      cancelled = true;
    };
  }, [activeTab, token, user?.token, setMyWantedPosts, t]);

  async function handleOfferDecision(offer, decision) {
    const authToken = token || user?.token;
    setActionError("");
    setSuccessMsg("");
    setBusyOfferId(offer.id);
    try {
      let res = null;
      if (decision === "accept") {
        res = await acceptLendOffer(offer.postId, offer.id, authToken);
      } else {
        res = await rejectLendOffer(offer.postId, offer.id, authToken);
      }

      if (typeof setMyWantedPosts === "function") {
        setMyWantedPosts((prev) =>
          (prev || []).map((p) => {
            if (String(p.id) !== String(offer.postId)) return p;
            if (decision === "accept") {
              return { ...p, status: "fulfilled", pendingOfferCount: 0 };
            }
            return {
              ...p,
              pendingOfferCount: Math.max(0, Number(p.pendingOfferCount || 0) - 1),
            };
          }),
        );
      }

      if (decision === "accept") {
        const acceptedItemId = res?.acceptedOffer?.offeredItemId;
        if (acceptedItemId && typeof setItems === "function") {
          setItems((prev) =>
            (prev || []).map((it) =>
              String(it.id) === String(acceptedItemId)
                ? { ...it, status: "reserved" }
                : it,
            ),
          );
        }
        if (res?.borrowRequest && typeof setRequests === "function") {
          const normalized = normalizeBorrowRequest(res.borrowRequest, items);
          if (normalized) {
            setRequests((prev) => [
              normalized,
              ...(prev || []).filter((r) => String(r.id) !== String(normalized.id)),
            ]);
          }
        }
      }

      const updatedPosts = await getMyWantedPosts(authToken).catch(() => null);
      if (Array.isArray(updatedPosts) && typeof setMyWantedPosts === "function") {
        setMyWantedPosts(updatedPosts);
      }
      setOfferItems((prev) =>
        prev.map((item) => {
          if (item.id === offer.id) {
            return {
              ...item,
              status: decision === "accept" ? "accepted" : "rejected",
            };
          }
          if (
            decision === "accept" &&
            item.postId === offer.postId &&
            String(item.status).toLowerCase() === "pending"
          ) {
            return { ...item, status: "rejected" };
          }
          return item;
        }),
      );
      setSuccessMsg(
        decision === "accept"
          ? t("incomingRequests.offerAcceptedNotice")
          : t("incomingRequests.offerRejectedNotice"),
      );
    } catch (err) {
      setActionError(err.message || t("validation.submitFailed"));
    } finally {
      setBusyOfferId(null);
    }
  }

  const checkIsItemOwner = (req) => {
    const matchedItem = (items || []).find((i) => String(i.id) === String(req.itemId));
    const ownerId = req.ownerId || matchedItem?.ownerId;
    const ownerName = req.owner || matchedItem?.owner;
    return Boolean(
      (user?.studentId && String(ownerId) === String(user.studentId)) ||
      (user?.id && String(ownerId) === String(user.id)) ||
      (user?.name && ownerName === user.name)
    );
  };

  const isItemReservedByOther = (req) => {
    return requests.some(
      (r) =>
        r.id !== req.id &&
        String(r.itemId) === String(req.itemId) &&
        r.status === "accepted"
    );
  };

  const myIncomingRequests = requests.filter((r) => checkIsItemOwner(r));
  const pending = myIncomingRequests.filter((r) => r.status === "pending").length;
  const accepted = myIncomingRequests.filter((r) => r.status === "accepted").length;
  const needsHandover = myIncomingRequests.filter((r) => {
    const matchedItem = items.find((i) => String(i.id) === String(r.itemId));
    return r.status === "accepted" && !isHandedOver(r, matchedItem) && !isReturned(r);
  }).length;
  const borrowTabBadgeCount = pending + needsHandover;

  async function updateStatus(id, status) {
    setActionError("");
    const authToken = token || user?.token;
    const ownerId = user?.studentId || user?.id;
    const targetReq = requests.find((r) => r.id === id);
    try {
      if (status === "cancelled") {
        await cancelBorrowRequest(id, authToken);
      } else {
        await updateBorrowRequestStatus(id, status, { ownerId }, authToken);
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      if (setItems && targetReq?.itemId) {
        const nextItemStatus =
          status === "accepted"
            ? "reserved"
            : status === "cancelled"
              ? "unavailable"
              : "available";
        setItems((prev) =>
          prev.map((item) =>
            item.id === targetReq.itemId
              ? { ...item, status: nextItemStatus }
              : item,
          ),
        );
      }
    } catch (err) {
      setActionError(err.message || t("validation.submitFailed"));
    }
  }

  // T-6.3: บันทึกหลักฐานสำเร็จ 
  function handleHandoverSuccess(handover) {
    const target = handoverReq;
    setRequests((prev) =>
      prev.map((r) => (r.id === target.id ? { ...r, handover } : r)),
    );
    if (setItems) {
      setItems((prev) =>
        prev.map((i) => (i.id === target.itemId ? { ...i, status: "borrowed" } : i)),
      );
    }
    setHandoverReq(null);
    setActionError("");
    setSuccessMsg(t("handover.success", { name: target.itemName }));
  }

  // US-07.2: บันทึกหลักฐานการส่งคืนสำเร็จ → สถานะคำขอเป็น returned และสิ่งของกลับมา available
  function handleReturnSuccess(returned) {
    const target = returnReq;
    setRequests((prev) =>
      prev.map((r) => (r.id === target.id ? { ...r, returned } : r)),
    );
    if (setItems) {
      setItems((prev) =>
        prev.map((i) => (i.id === target.itemId ? { ...i, status: "available" } : i)),
      );
    }
    setReturnReq(null);
    setActionError("");
    setSuccessMsg(t("returnEvidence.success", { name: target.itemName }));
  }

  function openResponseModal(req) {
    setActiveResponseReq(req);
    setResponseReason("");
    setModalError("");
  }

  async function handleModalResponse(action) {
    if (action === "request_change" && !responseReason.trim()) {
      setModalError(t("validation.reasonRequired", { defaultValue: "กรุณาระบุเหตุผลในการขอให้แก้ไขข้อมูล" }));
      return;
    }
    setModalError("");
    const authToken = token || user?.token;
    try {
      await respondToBorrowRequest(activeResponseReq.id, action, responseReason.trim(), authToken);
      const nextStatus = action === "request_change" ? "change_requested" : "rejected";
      setRequests((prev) =>
        prev.map((r) =>
          r.id === activeResponseReq.id
            ? { ...r, status: nextStatus, responseReason: responseReason.trim() }
            : r,
        ),
      );
      if (setItems && activeResponseReq?.itemId) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === activeResponseReq.itemId
              ? { ...item, status: "available" }
              : item,
          ),
        );
      }
      setActiveResponseReq(null);
      setResponseReason("");
    } catch (err) {
      setModalError(err.message || t("validation.submitFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t("incomingRequests.eyebrow")}
        title={t("incomingRequests.title")}
        subtitle={t("incomingRequests.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[var(--muted)]">{t("incomingRequests.totalRequests")}</small>
              <strong className="text-base font-bold text-[var(--text)]">{myIncomingRequests.length}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#FFF0C7]/70 dark:bg-[#3A2A14] border border-[#F5D782]/70 dark:border-[#5C4119] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[#8A5A08] dark:text-[#FBBF24]">{t("incomingRequests.pendingRequests")}</small>
              <strong className="text-base font-bold text-[#8A5A08] dark:text-[#FBBF24]">{pending}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#E4F3E8]/80 dark:bg-[#1B3526] border border-[#C3E6CB] dark:border-[#275238] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[#247A4B] dark:text-[#4ADE80]">{t("incomingRequests.acceptedRequests")}</small>
              <strong className="text-base font-bold text-[#247A4B] dark:text-[#4ADE80]">{accepted}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[#E0F2FE]/80 dark:bg-[#172E48] border border-[#BAE6FD] dark:border-[#1E3A5F] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[#0369A1] dark:text-[#7DD3FC]">{t("incomingRequests.awaitingHandover")}</small>
              <strong className="text-base font-bold text-[#0369A1] dark:text-[#7DD3FC]">{needsHandover}</strong>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-[var(--surface-tint)] border border-[var(--border)] flex flex-col min-w-[82px]">
              <small className="text-[11px] text-[var(--primary)]">{t("incomingRequests.pendingOffers")}</small>
              <strong className="text-base font-bold text-[var(--primary)]">{pendingOffersCount}</strong>
            </div>
          </div>
        }
      />

      <div
        className="flex items-center gap-2 border-b border-[var(--border)] pb-3 overflow-x-auto"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "requests"}
          className={`inline-flex items-center gap-2 shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[13.5px] font-medium border cursor-pointer transition-colors ${
            activeTab === "requests"
              ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-xs"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
          }`}
          onClick={() => handleTabChange("requests")}
        >
          <span>{t("incomingRequests.tabBorrowRequests")}</span>
          {borrowTabBadgeCount > 0 && (
            <span
              className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center ${
                activeTab === "requests"
                  ? "bg-white text-[var(--primary)]"
                  : "bg-[var(--primary)] text-white"
              }`}
            >
              {borrowTabBadgeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "offers"}
          className={`inline-flex items-center gap-2 shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[13.5px] font-medium border cursor-pointer transition-colors ${
            activeTab === "offers"
              ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-xs"
              : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
          }`}
          onClick={() => handleTabChange("offers")}
        >
          <HandHeart size={16} />
          <span>{t("incomingRequests.tabLendOffers")}</span>
          {pendingOffersCount > 0 && (
            <span
              className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center ${
                activeTab === "offers"
                  ? "bg-white text-[var(--primary)]"
                  : "bg-[var(--primary)] text-white"
              }`}
            >
              {pendingOffersCount}
            </span>
          )}
        </button>
      </div>

      <AlertBanner message={actionError} onClose={() => setActionError("")} />

      {successMsg && (
        <div className="alert alert-success" role="status">
          {successMsg}
          <button onClick={() => setSuccessMsg("")} className="alert-close">
            {t("myListings.closeAlert")}
          </button>
        </div>
      )}

      {activeTab === "offers" ? (
        offersLoading ? (
          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs text-sm text-[var(--muted)]">
            {t("common.loading")}
          </div>
        ) : offerItems.length ? (
          <div className="flex flex-col gap-4">
            {offerItems.map((offer) => {
              const isOfferPending = String(offer.status || "").toLowerCase() === "pending";
              const isBusy = busyOfferId === offer.id;
              return (
                <article
                  key={offer.id}
                  className="flex flex-col md:flex-row justify-between gap-5 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <Avatar name={offer.lenderName || offer.lenderId} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <CategoryBadge category={offer.postCategory} />
                          <StatusBadge status={offer.status} />
                        </div>
                        <h3 className="m-0 text-base font-semibold text-[var(--text)] truncate">
                          <Link
                            to={`/wanted/${offer.postId}`}
                            className="text-inherit no-underline hover:text-[var(--primary)] transition-colors"
                          >
                            {offer.postTitle}
                          </Link>
                        </h3>
                        <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                          {t("incomingRequests.offeredBy")}{" "}
                          <strong className="text-[var(--text)]">
                            {offer.lenderName || offer.lenderId}
                          </strong>
                        </p>
                      </div>
                    </div>

                    {offer.offeredItemTitle && (
                      <p className="mt-3 mb-0 text-[13px] text-[var(--text)]">
                        <strong className="text-[var(--muted)] mr-1">
                          {t("incomingRequests.offeredItemLabel")}
                        </strong>
                        {offer.offeredItemTitle}
                      </p>
                    )}

                    {offer.message && (
                      <p className="mt-2 mb-0 px-3 py-2 rounded-lg text-[13px] text-[var(--text)] bg-[var(--surface-subtle)] border-l-[3px] border-[var(--primary)] break-words">
                        {offer.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-center gap-2 shrink-0">
                    <Link
                      to={`/wanted/${offer.postId}`}
                      className="button button-outline button-sm"
                    >
                      {t("incomingRequests.viewWantedPost")} <ArrowRight size={15} />
                    </Link>
                    {isOfferPending && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="button button-primary button-sm"
                          disabled={isBusy}
                          onClick={() => handleOfferDecision(offer, "accept")}
                        >
                          <Check size={15} /> {t("incomingRequests.accept")}
                        </button>
                        <button
                          type="button"
                          className="button button-danger-outline button-sm"
                          disabled={isBusy}
                          onClick={() => handleOfferDecision(offer, "reject")}
                        >
                          <X size={15} /> {t("incomingRequests.reject")}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={t("incomingRequests.offersEmptyTitle")}
            description={t("incomingRequests.offersEmptyDesc")}
          />
        )
      ) : myIncomingRequests.length ? (
        <div className="flex flex-col gap-4">
          {myIncomingRequests.map((req) => {
            // T-6.3 / US-07.2 / US-08.2: ส่งมอบแล้ว แสดง "กำลังยืม" / ส่งคืนแล้ว แสดง "คืนแล้ว"
            const matchedItem = items.find((i) => String(i.id) === String(req.itemId));
            const returned = isReturned(req);
            const handedOver = isHandedOver(req, matchedItem);
            const canViewEvidence = Boolean(
              handedOver ||
                returned ||
                (req?.status === "accepted" && matchedItem?.status === "available"),
            );
            return (
              <RequestCard
                key={req.id}
                request={req}
                role="owner"
                status={returned ? "returned" : handedOver ? "borrowed" : req.status}
                actions={
                  checkIsItemOwner(req) && (
                    req.status === "pending" ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            className="button button-primary button-sm"
                            disabled={isItemReservedByOther(req)}
                            title={isItemReservedByOther(req) ? t("incomingRequests.itemAlreadyReserved") : ""}
                            onClick={() => updateStatus(req.id, "accepted")}
                          >
                            <Check size={16} /> {t("incomingRequests.accept")}
                          </button>
                          <button
                            className="button button-danger-outline button-sm"
                            onClick={() => openResponseModal(req)}
                          >
                            <MessageSquare size={16} /> {t("incomingRequests.respond")}
                          </button>
                        </div>
                        {isItemReservedByOther(req) && (
                          <small className="text-[11px] font-medium text-[#8A5A08] dark:text-[#FBBF24] leading-snug">
                            {t("incomingRequests.itemAlreadyReserved")}
                          </small>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-stretch sm:items-end gap-2">
                        {returned ? (
                          <>
                            <small className="text-[13px] text-[var(--muted)] text-center sm:text-right">
                              {t("returnEvidence.done")}
                            </small>
                            <button
                              type="button"
                              className="button button-outline button-sm"
                              onClick={() => setEvidenceRequestId(req.id)}
                            >
                              <History size={15} /> {t("evidenceTimeline.button")}
                            </button>
                          </>
                        ) : handedOver ? (
                          <>
                            <small className="text-[13px] text-[var(--muted)] text-center sm:text-right">
                              {t("handover.done")}
                            </small>
                            <button
                              type="button"
                              className="button button-primary button-sm"
                              onClick={() => {
                                setSuccessMsg("");
                                setReturnReq(req);
                              }}
                            >
                              <PackageCheck size={16} /> {t("returnEvidence.button")}
                            </button>
                            <button
                              type="button"
                              className="button button-outline button-sm"
                              onClick={() => setEvidenceRequestId(req.id)}
                            >
                              <History size={15} /> {t("evidenceTimeline.button")}
                            </button>
                          </>
                        ) : canViewEvidence ? (
                          <button
                            type="button"
                            className="button button-outline button-sm"
                            onClick={() => setEvidenceRequestId(req.id)}
                          >
                            <History size={15} /> {t("evidenceTimeline.button")}
                          </button>
                        ) : (
                          <>
                            {/* T-6.3: ปุ่มบันทึกหลักฐานการส่งมอบ เฉพาะคำขอ accepted ที่ยังไม่ส่งมอบ */}
                            {req.status === "accepted" && (
                              <button
                                type="button"
                                className="button button-primary button-sm"
                                onClick={() => {
                                  setSuccessMsg("");
                                  setHandoverReq(req);
                                }}
                              >
                                <PackageCheck size={16} /> {t("handover.button")}
                              </button>
                            )}
                            <button
                              className="text-button"
                              onClick={() => updateStatus(req.id, "pending")}
                            >
                              {t("incomingRequests.resetToPending")}
                            </button>
                          </>
                        )}
                      </div>
                    )
                  )
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={t("incomingRequests.emptyTitle")}
          description={t("incomingRequests.emptyDesc")}
        />
      )}

      {/* T-6.3: โมดอลบันทึกหลักฐานการส่งมอบ */}
      {handoverReq && (
        <HandoverModal
          request={handoverReq}
          onClose={() => setHandoverReq(null)}
          onSuccess={handleHandoverSuccess}
        />
      )}

      {/* US-08.2: โมดอล Timeline ประวัติและหลักฐานการยืม-คืน */}
      {evidenceRequestId && (
        <LoanEvidenceTimelineModal
          requestId={evidenceRequestId}
          onClose={() => setEvidenceRequestId(null)}
        />
      )}

      {/* US-07.2: โมดอลบันทึกหลักฐานการส่งคืน */}
      {returnReq && (
        <ReturnModal
          request={returnReq}
          onClose={() => setReturnReq(null)}
          onSuccess={handleReturnSuccess}
        />
      )}

      {activeResponseReq && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveResponseReq(null)}
        >
          <div
            className="modal-card flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="m-0 text-lg font-semibold text-[var(--text)]">
                {t("incomingRequests.responseModalTitle")}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveResponseReq(null)}
                aria-label={t("common.close", { defaultValue: "ปิด" })}
              >
                <X size={20} />
              </button>
            </div>
            <p className="m-0 mb-4 text-[13px] leading-relaxed text-[var(--muted)]">
              {t("incomingRequests.responseModalDesc")}
            </p>
            <div className="mb-4 p-3.5 rounded-[10px] bg-[var(--surface-subtle)] border border-[var(--border)]">
              <strong className="block text-sm font-semibold text-[var(--text)]">
                {activeResponseReq.itemName}
              </strong>
              <div className="mt-1 text-xs text-[var(--muted)]">
                {t("incomingRequests.requestedBy")}: {activeResponseReq.borrower}
              </div>
            </div>
            <div className="field">
              <label htmlFor="responseReason">
                {t("incomingRequests.reasonLabel")}
              </label>
              <textarea
                id="responseReason"
                rows={3}
                value={responseReason}
                onChange={(e) => setResponseReason(e.target.value)}
                placeholder={t("incomingRequests.reasonPlaceholder")}
              />
              {modalError && (
                <small className="field-error">
                  <AlertCircle size={13} />
                  {modalError}
                </small>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                className="button button-outline button-info-outline"
                onClick={() => handleModalResponse("request_change")}
              >
                {t("incomingRequests.requestChange")}
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={() => handleModalResponse("reject")}
              >
                {t("incomingRequests.permanentReject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}