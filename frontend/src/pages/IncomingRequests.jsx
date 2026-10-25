import React from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";

function formatDate(date, language = "th") {
  if (!date) return "—";
  const locale = language.startsWith("en") ? "en-US" : "th-TH";
  return new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function IncomingRequests({ requests, setRequests }) {
  const { i18n } = useTranslation();
  const pending = requests.filter((r) => r.status === "pending").length;
  const accepted = requests.filter((r) => r.status === "accepted").length;

  function updateStatus(id, status) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="INCOMING REQUESTS"
        title="คำขอยืมที่เข้ามา"
        subtitle="ตรวจสอบรายละเอียดก่อนตัดสินใจรับหรือปฏิเสธคำขอ"
        action={
          <div className="request-summary">
            <div className="request-summary-item">
              <small>คำขอทั้งหมด</small>
              <strong>{requests.length}</strong>
            </div>
            <div className="request-summary-item request-summary-pending">
              <small>รอพิจารณา</small>
              <strong>{pending}</strong>
            </div>
            <div className="request-summary-item request-summary-accepted">
              <small>ยอมรับแล้ว</small>
              <strong>{accepted}</strong>
            </div>
          </div>
        }
      />

      {requests.length ? (
        <div className="requests-list requests-list-updated">
          {requests.map((req) => (
            <article className="request-card request-card-updated" key={req.id}>
              <div className="request-main">
                <div className="request-card-top">
                  <Avatar name={req.borrower} />
                  <div className="request-title">
                    <h3>{req.itemName}</h3>
                    <p>
                      ขอยืมโดย <strong>{req.borrower}</strong>
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <p className="request-reason">{req.reason}</p>
              </div>

              <div className="request-side">
                <dl className="request-dates">
                  <div>
                    <dt>วันที่ยืม</dt>
                    <dd>{formatDate(req.borrowDate, i18n.language)}</dd>
                  </div>
                  <div>
                    <dt>วันที่คืน</dt>
                    <dd>{formatDate(req.returnDate, i18n.language)}</dd>
                  </div>
                </dl>

                {req.status === "pending" ? (
                  <div className="request-actions">
                    <button
                      className="button button-primary"
                      onClick={() => updateStatus(req.id, "accepted")}
                    >
                      <Check size={16} /> ยอมรับ
                    </button>
                    <button
                      className="button button-danger-outline"
                      onClick={() => updateStatus(req.id, "rejected")}
                    >
                      <X size={16} /> ปฏิเสธ
                    </button>
                  </div>
                ) : (
                  <div className="request-status-updated">
                    <button
                      className="text-button"
                      onClick={() => updateStatus(req.id, "pending")}
                    >
                      เปลี่ยนกลับเป็นรอพิจารณา
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีคำขอยืม"
          description="เมื่อมีคนส่งคำขอยืมสิ่งของของคุณ รายการจะแสดงที่หน้านี้"
        />
      )}
    </div>
  );
}
