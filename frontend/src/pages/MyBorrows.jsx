import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { getRequestTransactionMap } from "../api/transactionsApi";
import HandoverModal from "../components/HandoverModal";

function formatDate(date, locale = "th-TH") {
  if (!date) return "—";
  const dateStr = String(date);
  const parsed = dateStr.includes("T") ? new Date(dateStr) : new Date(`${dateStr}T12:00:00`);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// T-6.3: รับ setItems เพิ่ม เพื่อเปลี่ยนสถานะสิ่งของเป็น borrowed บนหน้าจอหลังบันทึกหลักฐาน
export default function MyBorrows({ requests = [], setItems }) {
  const { user, token } = useAuth();
  const { t, i18n } = useTranslation();
  // T-6.3: ธุรกรรมของแต่ละคำขอ { [requestId]: transaction } (มี Transaction = ส่งมอบแล้ว)
  const [handoverByRequest, setHandoverByRequest] = useState({});
  const [handoverReady, setHandoverReady] = useState(false);
  const [handoverReq, setHandoverReq] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const acceptedKey = requests
    .filter((r) => r.status === "accepted")
    .map((r) => `${r.id}:${r.itemId}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;
    getRequestTransactionMap(requests, token)
      .then((map) => {
        if (cancelled) return;
        setHandoverByRequest((prev) => ({ ...map, ...prev }));
        setHandoverReady(true);
      })
      .catch(() => {
        // โหลดไม่สำเร็จ → ไม่แสดงปุ่ม (กันบันทึกซ้ำโดยไม่รู้ว่าส่งมอบไปแล้ว)
        if (!cancelled) setHandoverReady(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedKey, token]);
  const dateLocale = i18n.language === "en" ? "en-US" : "th-TH";
  
  // คัดกรองมาเฉพาะรายการที่ "ฉัน" (ผู้ใช้ปัจจุบัน) เป็นคนกดยืม
  const myBorrows = (requests || []).filter((r) =>
    Boolean(
      (user?.studentId && String(r.borrowerId) === String(user.studentId)) ||
      (user?.id && String(r.borrowerId) === String(user.id)) ||
      (user?.name && r.borrower === user.name)
    )
  );

  // T-6.3: backend บันทึกหลักฐานสำเร็จ (201) → แสดง "กำลังยืม" ทันที
  function handleHandoverSuccess(transaction) {
    const target = handoverReq;
    setHandoverByRequest((prev) => ({ ...prev, [target.id]: transaction }));
    if (setItems) {
      setItems((prev) =>
        prev.map((i) => (i.id === target.itemId ? { ...i, status: "borrowed" } : i)),
      );
    }
    setHandoverReq(null);
    setSuccessMsg(t("handover.success", { name: target.itemName }));
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow={t("myBorrows.eyebrow", { defaultValue: "MY BORROWS" })}
        title={t("myBorrows.title", { defaultValue: "การยืมของฉัน" })}
        subtitle={t("myBorrows.subtitle", { defaultValue: "ติดตามสถานะคำขอยืมสิ่งของที่คุณส่งไปให้เพื่อนพิจารณา" })}
      />

      {successMsg && (
        <div className="alert alert-success" role="status">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="alert-close">
            {t("myListings.closeAlert")}
          </button>
        </div>
      )}

      {myBorrows.length ? (
        <div className="requests-list">
          {myBorrows.map((req) => {
            // T-6.3: มี Transaction ของคำขอนี้ = ส่งมอบแล้ว (backend สร้างพร้อมหลักฐาน)
            const handedOver = Boolean(handoverByRequest[req.id]);
            return (
            <article className="request-card" key={req.id}>
              <div className="request-main">
                <div className="request-card-top">
                  <Avatar name={req.itemName} />
                  <div className="request-title">
                    <h3>{req.itemName}</h3>
                    <p>
                      {t("myBorrows.requestedAt", {
                        date: formatDate(req.borrowDate, dateLocale),
                        defaultValue: `ส่งคำขอถึงเจ้าของเมื่อ ${formatDate(req.borrowDate, dateLocale)}`,
                      })}
                    </p>
                  </div>
                  <StatusBadge status={handedOver ? "borrowed" : req.status} />
                </div>
                <p className="request-reason">
                  {t("myBorrows.reasonPrefix", { defaultValue: "เหตุผล: " })}{req.reason}
                </p>
                {req.responseReason && (
                  <p
                    className="request-feedback"
                    style={{
                      fontSize: "0.85rem",
                      color: req.status === "rejected" ? "#B9382B" : "#0369A1",
                      marginTop: "6px",
                      background: req.status === "rejected" ? "#FCE8E4" : "#E0F2FE",
                      borderLeft: req.status === "rejected" ? "3px solid #B9382B" : "3px solid #0284c7",
                      padding: "6px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    <strong>{t("myBorrows.ownerFeedback", { defaultValue: "ข้อความจากเจ้าของ: " })}</strong>
                    {req.responseReason}
                  </p>
                )}
              </div>

              <div className="request-side">
                <dl className="request-dates">
                  <div>
                    <dt>{t("myBorrows.borrowDate", { defaultValue: "วันที่ต้องการยืม" })}</dt>
                    <dd>{formatDate(req.borrowDate, dateLocale)}</dd>
                  </div>
                  <div>
                    <dt>{t("myBorrows.returnDate", { defaultValue: "วันที่กำหนดคืน" })}</dt>
                    <dd>{formatDate(req.returnDate, dateLocale)}</dd>
                  </div>
                </dl>
                {/* T-6.3: ปุ่มบันทึกหลักฐานการส่งมอบ เฉพาะคำขอ accepted ที่ยังไม่ส่งมอบ */}
                {handedOver ? (
                  <div className="request-status-updated handover-actions">
                    <small className="status-hint">{t("handover.done")}</small>
                  </div>
                ) : (
                  req.status === "accepted" &&
                  handoverReady && (
                    <div className="request-status-updated handover-actions">
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
                    </div>
                  )
                )}
                {req.status === "change_requested" && (
                  <div style={{ marginTop: "12px" }}>
                    <Link
                      to={`/items/${req.itemId}`}
                      className="button button-outline button-sm button-full"
                      style={{ borderColor: "#0284c7", color: "#0284c7" }}
                    >
                      {t("myBorrows.editRequest", { defaultValue: "แก้ไขคำขอยืม" })}
                    </Link>
                  </div>
                )}
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={t("myBorrows.emptyTitle", { defaultValue: "ยังไม่มีประวัติการยืม" })}
          description={t("myBorrows.emptyDesc", { defaultValue: "คุณยังไม่ได้ส่งคำขอยืมสิ่งของชิ้นใดเลย ลองค้นหาของที่สนใจดูสิ" })}
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
    </div>
  );
}
