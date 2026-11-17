import React, { useState } from "react";
import { PackageCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeading, EmptyState, RequestCard } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import HandoverModal, { isHandedOver } from "../components/HandoverModal";

// T-6.3: รับ items/setItems/setRequests เพิ่ม เพื่ออัปเดตสถานะหลังบันทึกหลักฐานสำเร็จ
export default function MyBorrows({ requests = [], items = [], setItems, setRequests }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [handoverReq, setHandoverReq] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  
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
        <div className="requests-list requests-list-updated">
          {myBorrows.map((req) => {
            // T-6.3: ส่งมอบแล้ว แสดงสถานะ "กำลังยืม"
            const handedOver = isHandedOver(
              req,
              items.find((i) => String(i.id) === String(req.itemId)),
            );
            return (
              <RequestCard
                key={req.id}
                request={req}
                role="borrower"
                status={handedOver ? "borrowed" : req.status}
                actions={
                  <>
                    {/* T-6.3: ปุ่มบันทึกหลักฐานการส่งมอบ เฉพาะคำขอ accepted ที่ยังไม่ส่งมอบ */}
                    {handedOver ? (
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
                      <div className="request-edit-wrap">
                        <Link
                          to={`/items/${req.itemId}`}
                          className="button button-outline button-info-outline button-sm button-full"
                        >
                          {t("myBorrows.editRequest", { defaultValue: "แก้ไขคำขอยืม" })}
                        </Link>
                      </div>
                    )}
                  </>
                }
              />
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