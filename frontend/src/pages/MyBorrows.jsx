import React from "react";
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

export default function MyBorrows({ requests }) {
  const { user } = useAuth();
  
  // คัดกรองมาเฉพาะรายการที่ "ฉัน" (ผู้ใช้ปัจจุบัน) เป็นคนกดยืม
  const myBorrows = requests.filter(r => r.borrower === user.name);

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="MY BORROWS"
        title="การยืมของฉัน"
        subtitle="ติดตามสถานะคำขอยืมสิ่งของที่คุณส่งไปให้เพื่อนพิจารณา"
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
                      ส่งคำขอถึงเจ้าของเมื่อ <strong>{formatDate(req.borrowDate)}</strong>
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <p className="request-reason">เหตุผล: {req.reason}</p>
              </div>

              <div className="request-side">
                <dl className="request-dates">
                  <div>
                    <dt>วันที่ต้องการยืม</dt>
                    <dd>{formatDate(req.borrowDate)}</dd>
                  </div>
                  <div>
                    <dt>วันที่กำหนดคืน</dt>
                    <dd>{formatDate(req.returnDate)}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีประวัติการยืม"
          description="คุณยังไม่ได้ส่งคำขอยืมสิ่งของชิ้นใดเลย ลองค้นหาของที่สนใจดูสิ"
        />
      )}
    </div>
  );
}