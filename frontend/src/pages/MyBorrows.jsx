import React from "react";
import { useTranslation } from "react-i18next";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

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

export default function MyBorrows({ requests = [] }) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? "en-US" : "th-TH";
  
  // คัดกรองมาเฉพาะรายการที่ "ฉัน" (ผู้ใช้ปัจจุบัน) เป็นคนกดยืม
  const myBorrows = (requests || []).filter((r) =>
    Boolean(
      (user?.studentId && r.borrowerId === user.studentId) ||
      (user?.id && r.borrowerId === user.id) ||
      (user?.name && r.borrower === user.name)
    )
  );

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow={t("myBorrows.eyebrow", { defaultValue: "MY BORROWS" })}
        title={t("myBorrows.title", { defaultValue: "การยืมของฉัน" })}
        subtitle={t("myBorrows.subtitle", { defaultValue: "ติดตามสถานะคำขอยืมสิ่งของที่คุณส่งไปให้เพื่อนพิจารณา" })}
      />

      {myBorrows.length ? (
        <div className="requests-list">
          {myBorrows.map((req) => (
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
                  <StatusBadge status={req.status} />
                </div>
                <p className="request-reason">
                  {t("myBorrows.reasonPrefix", { defaultValue: "เหตุผล: " })}{req.reason}
                </p>
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
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("myBorrows.emptyTitle", { defaultValue: "ยังไม่มีประวัติการยืม" })}
          description={t("myBorrows.emptyDesc", { defaultValue: "คุณยังไม่ได้ส่งคำขอยืมสิ่งของชิ้นใดเลย ลองค้นหาของที่สนใจดูสิ" })}
        />
      )}
    </div>
  );
}