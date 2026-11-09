import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeading, EmptyState, RequestCard } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

export default function MyBorrows({ requests = [] }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // คัดกรองมาเฉพาะรายการที่ "ฉัน" (ผู้ใช้ปัจจุบัน) เป็นคนกดยืม
  const myBorrows = (requests || []).filter((r) =>
    Boolean(
      (user?.studentId && String(r.borrowerId) === String(user.studentId)) ||
      (user?.id && String(r.borrowerId) === String(user.id)) ||
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
        <div className="requests-list requests-list-updated">
          {myBorrows.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              role="borrower"
              actions={
                req.status === "change_requested" && (
                  <div className="request-edit-wrap">
                    <Link
                      to={`/items/${req.itemId}`}
                      className="button button-outline button-info-outline button-sm button-full"
                    >
                      {t("myBorrows.editRequest", { defaultValue: "แก้ไขคำขอยืม" })}
                    </Link>
                  </div>
                )
              }
            />
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