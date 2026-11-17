import React, { useState } from "react";
import { PackageCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import HandoverModal, { isHandedOver, isReturned } from "../components/HandoverModal";

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

// T-6.3: รับ items/setItems/setRequests เพิ่ม เพื่ออัปเดตสถานะหลังบันทึกหลักฐานสำเร็จ
export default function MyBorrows({ requests = [], items = [], setItems, setRequests }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [handoverReq, setHandoverReq] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const dateLocale = i18n.language === "en" ? "en-US" : "th-TH";
  
  const myBorrows = (requests || []).filter((r) =>
    Boolean(
      (user?.studentId && String(r.borrowerId) === String(user.studentId)) ||
      (user?.id && String(r.borrowerId) === String(user.id)) ||
      (user?.name && r.borrower === user.name)
    )
  );

  // T-6.3: บันทึกหลักฐานสำเร็จ → คำขอเก็บ handover และสิ่งของเป็น borrowed ทันที
  function handleHandoverSuccess(handover) {
    const target = handoverReq;
    if (setRequests) {
      setRequests((prev) =>
        prev.map((r) => (r.id === target.id ? { ...r, handover } : r)),
      );
    }
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
          {successMsg}
          <button onClick={() => setSuccessMsg("")} className="alert-close">
            {t("myListings.closeAlert")}
          </button>
        </div>
      )}

      {myBorrows.length ? (
        <div className="requests-list">
          {myBorrows.map((req) => {
            // T-6.3 / US-07.3: ส่งมอบแล้วแสดง "กำลังยืม" / คืนแล้วแสดง "คืนแล้ว" (คงประวัติการยืมไว้)
            const returned = isReturned(req);
            const handedOver = isHandedOver(
              req,
              items.find((i) => i.id === req.itemId),
            );
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
                  <StatusBadge status={returned ? "returned" : handedOver ? "borrowed" : req.status} />
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
                {/* T-6.3 / US-07.3: ปุ่มบันทึกหลักฐานการส่งมอบ เฉพาะคำขอ accepted ที่ยังไม่ส่งมอบและยังไม่คืน */}
                {returned ? (
                  <div className="request-status-updated">
                    <small className="status-hint">{t("returnEvidence.done")}</small>
                  </div>
                ) : handedOver ? (
                  <div className="request-status-updated">
                    <small className="status-hint">{t("handover.done")}</small>
                  </div>
                ) : (
                  req.status === "accepted" && (
                    <div className="request-status-updated">
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