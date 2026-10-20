import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";
import { BORROWABLE_STATUS, hasAcceptedOverlap } from "../data";

function formatDate(date) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// FIX : รับ items/setItems เพิ่ม เพื่อกรองตามเจ้าของและ sync สถานะ item
export default function IncomingRequests({
  items,
  setItems,
  requests,
  setRequests,
}) {
  const { user } = useAuth();
  const [notice, setNotice] = useState("");

  // FIX : แสดงเฉพาะคำขอของสิ่งของที่ currentUser เป็นเจ้าของ
  // เดิมแสดงคำขอของทุกคน ทำให้ใครก็รับ/ปฏิเสธคำขอของคนอื่นได้
  const itemById = new Map(items.map((i) => [i.id, i]));
  const mine = requests.filter((r) => {
    const item = itemById.get(r.itemId);
    return item && item.owner === user.name && item.status !== "deleted";
  });

  const pending = mine.filter((r) => r.status === "pending").length;
  const accepted = mine.filter((r) => r.status === "accepted").length;

  // FIX : Accept → request = accepted และ item = reserved
  function accept(req) {
    const item = itemById.get(req.itemId);
    if (!item || item.owner !== user.name) return; // ตรวจสิทธิ์เจ้าของ
    // ADD : รับได้เมื่อ item ยังยืมได้ และช่วงวันที่ไม่ซ้อนกับคำขอที่ accepted ไปแล้ว
    if (!BORROWABLE_STATUS.includes(item.status)) {
      setNotice("สิ่งของนี้ไม่เปิดให้ยืมในขณะนี้ จึงรับคำขอไม่ได้");
      return;
    }
    if (hasAcceptedOverlap(requests, req)) {
      setNotice("ช่วงวันที่นี้ซ้อนกับคำขอที่ยอมรับไปแล้ว จึงรับคำขอไม่ได้");
      return;
    }
    setNotice("");
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "accepted" } : r)),
    );
    setItems((prev) =>
      // ADD : เปลี่ยนเป็น reserved เฉพาะตอนเป็น available (ถ้า reserved/borrowed อยู่แล้วคงสถานะเดิม)
      prev.map((i) =>
        i.id === req.itemId && i.status === "available"
          ? { ...i, status: "reserved" }
          : i,
      ),
    );
  }

  // FIX : Reject → request = rejected, item ยังเป็น available (ไม่แตะ item)
  function reject(req) {
    const item = itemById.get(req.itemId);
    if (!item || item.owner !== user.name) return;
    setNotice("");
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r)),
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
              <strong>{mine.length}</strong>
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

      {notice && (
        <div className="alert alert-error" role="alert">
          {notice}
        </div>
      )}

      {mine.length ? (
        <div className="requests-list requests-list-updated">
          {mine.map((req) => (
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
                    <dd>{formatDate(req.borrowDate)}</dd>
                  </div>
                  <div>
                    <dt>วันที่คืน</dt>
                    <dd>{formatDate(req.returnDate)}</dd>
                  </div>
                </dl>

                {req.status === "pending" ? (
                  <div className="request-actions">
                    <button
                      className="button button-primary"
                      onClick={() => accept(req)}
                      // ADD: ปิดปุ่มรับเมื่อ item ไม่เปิดให้ยืม หรือวันซ้อนกับคำขอที่ accepted
                      disabled={
                        !BORROWABLE_STATUS.includes(itemById.get(req.itemId)?.status) ||
                        hasAcceptedOverlap(requests, req)
                      }
                    >
                      <Check size={16} /> ยอมรับ
                    </button>
                    <button
                      className="button button-danger-outline"
                      onClick={() => reject(req)}
                    >
                      <X size={16} /> ปฏิเสธ
                    </button>
                  </div>
                ) : (
                  // FIX : ลบปุ่ม "เปลี่ยนกลับเป็นรอพิจารณา" ออก
                  <div className="request-status-updated">
                    <small>
                      {req.status === "accepted"
                        ? "สิ่งของถูกจองแล้ว รอนัดส่งมอบ"
                        : req.status === "cancelled"
                          ? "ผู้ยืมยกเลิกคำขอแล้ว"
                          : "ปฏิเสธคำขอนี้แล้ว"}
                    </small>
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
