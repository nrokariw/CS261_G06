import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  PlusCircle,
  ClipboardList,
  Inbox,
  Handshake, // FIX : ไอคอนเมนู "รายการยืมของฉัน"
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import {
  SEED_ITEMS,
  SEED_REQUESTS,
  STORAGE_KEYS,
  ITEM_STATUS,
  REQUEST_STATUS,
} from "./data";
import { Avatar } from "./components/UI";
import Browse from "./pages/Browse";
import CreateListing from "./pages/CreateListing";
import ItemDetails from "./pages/ItemDetails";
import MyListings from "./pages/MyListings";
import MyBorrows from "./pages/MyBorrows";
import IncomingRequests from "./pages/IncomingRequests";
import NotFound from "./pages/NotFound";
import { useAuth } from "./contexts/AuthContext";


const isValidItem = (i) =>
  i &&
  typeof i.id === "string" &&
  typeof i.name === "string" &&
  typeof i.owner === "string" &&
  ITEM_STATUS.includes(i.status);

const isValidRequest = (r) =>
  r &&
  typeof r.id === "string" &&
  typeof r.itemId === "string" &&
  typeof r.borrower === "string" &&
  REQUEST_STATUS.includes(r.status);

function readStore(key, fallback, isValid) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isValid)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="12.5" cy="17" r="10" fill="#F8A91F" />
      <circle cx="21.5" cy="17" r="10" fill="#EC6426" fillOpacity=".92" />
    </svg>
  );
}

export default function App() {
  const { user } = useAuth();
  const [items, setItems] = useState(() =>
    readStore(STORAGE_KEYS.items, SEED_ITEMS, isValidItem),
  );
  const [requests, setRequests] = useState(() =>
    readStore(STORAGE_KEYS.requests, SEED_REQUESTS, isValidRequest),
  );
  const [mobileMenu, setMobileMenu] = useState(false);
  const [storageError, setStorageError] = useState(""); // FIX : แจ้งผู้ใช้เมื่อบันทึกไม่ได้
  const location = useLocation();


  function persist(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setStorageError("");
    } catch {
      setStorageError(
        "บันทึกข้อมูลไม่สำเร็จ พื้นที่จัดเก็บในเบราว์เซอร์เต็ม ลองลบประกาศที่มีรูปขนาดใหญ่ออก",
      );
    }
  }
  useEffect(() => persist(STORAGE_KEYS.items, items), [items]);
  useEffect(() => persist(STORAGE_KEYS.requests, requests), [requests]);
  useEffect(() => setMobileMenu(false), [location.pathname]);

  // FIX : badge จำนวนคำขอ นับเฉพาะคำขอที่เข้าสิ่งของของ currentUser
  // เดิมนับคำขอ pending ของทุกคน
  const myItemIds = new Set(
    items.filter((i) => i.owner === user.name).map((i) => i.id),
  );
  const pendingCount = requests.filter(
    (r) => r.status === "pending" && myItemIds.has(r.itemId),
  ).length;
  const navItems = [
    { to: "/", label: "หน้าหลัก", icon: LayoutGrid, end: true },
    { to: "/create", label: "สร้างประกาศ", icon: PlusCircle },
    { to: "/my-listings", label: "ประกาศของฉัน", icon: ClipboardList },
    { to: "/requests", label: "คำขอยืมเข้า", icon: Inbox, count: pendingCount },
    // FIX : เพิ่มเมนู /my-borrows
    { to: "/my-borrows", label: "รายการยืมของฉัน", icon: Handshake },
  ];

  const { pathname, search } = location;
  let currentLabel = navItems.find((n) => n.to === pathname)?.label;
  if (pathname === "/create" && search.includes("edit="))
    currentLabel = "แก้ไขประกาศ";
  if (pathname.startsWith("/items/")) currentLabel = "รายละเอียดสิ่งของ";
  if (!currentLabel) currentLabel = "ไม่พบหน้า";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <NavLink to="/" className="brand" aria-label="CampusShare หน้าหลัก">
          <BrandMark />
          <span className="brand-name">CampusShare</span>
        </NavLink>
        <nav className="side-nav" aria-label="เมนูหลัก">
          {navItems.map(({ to, label, icon: Icon, end, count }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.75} />
              <span>{label}</span>
              {count > 0 && <b className="nav-count">{count}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Avatar name={user.name} />
          <div>
            <strong>{user.name}</strong>
            <small>นักศึกษาผู้ใช้งาน</small>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="scrim"
          aria-label="ปิดเมนู"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className="breadcrumbs" aria-label="ตำแหน่งปัจจุบัน">
            <Link to="/">CampusShare</Link>
            <ChevronRight size={15} aria-hidden="true" />
            <strong aria-current="page">{currentLabel}</strong>
          </nav>
          <span className="top-user">
            <Avatar name={user.name} size="sm" />
            {/* FIX : เดิม hardcode <span>Ploy S.</span> */}
            <span>{user.name}</span>
          </span>
        </header>

        <main className="page-container">
          {storageError && (
            <div className="alert alert-error" role="alert">
              {storageError}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Browse items={items} />} />
            <Route
              path="/create"
              element={<CreateListing items={items} setItems={setItems} />}
            />
            <Route
              path="/items/:id"
              // FIX : ส่ง requests เข้าไปเพื่อเช็กวันที่ซ้อนกัน
              element={
                <ItemDetails
                  items={items}
                  requests={requests}
                  setRequests={setRequests}
                />
              }
            />
            <Route
              path="/my-listings"
              element={<MyListings items={items} setItems={setItems} />}
            />
            <Route
              path="/requests"
              element={
                // FIX : ต้องส่ง items/setItems เพื่อกรองตามเจ้าของ และเปลี่ยน item เป็น reserved ตอน Accept
                <IncomingRequests
                  items={items}
                  setItems={setItems}
                  requests={requests}
                  setRequests={setRequests}
                />
              }
            />
            <Route
              path="/my-borrows"
              element={
                <MyBorrows
                  items={items}
                  requests={requests}
                  setRequests={setRequests}
                />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <footer className="site-footer">
          <span>CampusShare</span>
          <span>A campus community built on sharing.</span>
        </footer>
      </div>
    </div>
  );
}
