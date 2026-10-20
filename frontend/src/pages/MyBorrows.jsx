// ✅ FIX (Step 5): หน้าใหม่ "รายการยืมของฉัน" (/my-borrows)
// แสดงคำขอยืมที่ currentUser เป็นผู้ส่ง พร้อมสถานะ และยกเลิกคำขอที่ยัง pending ได้
import React from "react";
import { Link } from "react-router-dom";
import { PageHeading, StatusBadge, EmptyState, Avatar } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

function formatDate(date) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyBorrows({ items, requests, setRequests }) {
  const { user } = useAuth();
  const mine = requests.filter((r) => r.borrower === user.name);
  const itemById = new Map(items.map((i) => [i.id, i]));

  // ยกเลิกได้เฉพาะคำขอที่ยังไม่ถูกพิจารณา (pending → cancelled)
  function cancel(id) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id && r.status === "pending"
          ? { ...r, status: "cancelled" }
          : r,
      ),
    );
  }

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="MY BORROWS"
        title="รายการยืมของฉัน"
        subtitle="ติดตามสถานะคำขอยืมที่คุณส่งไว้ และยกเลิกคำขอที่ยังรอพิจารณา"
        action={<span className="result-count">{mine.length} รายการ</span>}
      />

      {mine.length ? (
        <div className="requests-list requests-list-updated">
          {mine.map((req) => {
            const item = itemById.get(req.itemId);
            return (
              <article className="request-card request-card-updated" key={req.id}>
                <div className="request-main">
                  <div className="request-card-top">
                    <Avatar name={item?.owner || "?"} />
                    <div className="request-title">
                      <h3>
                        {item && item.status !== "deleted" ? (
                          <Link to={`/items/${item.id}`}>{req.itemName}</Link>
                        ) : (
                          req.itemName
                        )}
                      </h3>
                      <p>
                        เจ้าของ <strong>{item?.owner || "—"}</strong>
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
                        className="button button-danger-outline"
                        onClick={() => cancel(req.id)}
                      >
                        ยกเลิกคำขอ
                      </button>
                    </div>
                  ) : (
                    <div className="request-status-updated">
                      <small>
                        {req.status === "accepted"
                          ? "เจ้าของยอมรับแล้ว รอนัดส่งมอบ"
                          : req.status === "rejected"
                            ? "เจ้าของปฏิเสธคำขอนี้"
                            : "คุณยกเลิกคำขอนี้แล้ว"}
                      </small>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีรายการยืม"
          description="เมื่อคุณส่งคำขอยืมสิ่งของ รายการจะแสดงที่หน้านี้"
        />
      )}
    </div>
  );
}
