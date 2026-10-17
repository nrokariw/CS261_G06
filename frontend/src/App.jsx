import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  PlusCircle,
  ClipboardList,
  Inbox,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { SEED_ITEMS, SEED_REQUESTS } from "./data";
import { Avatar } from "./components/UI";
import Browse from "./pages/Browse";
import CreateListing from "./pages/CreateListing";
import ItemDetails from "./pages/ItemDetails";
import MyListings from "./pages/MyListings";
import IncomingRequests from "./pages/IncomingRequests";
import NotFound from "./pages/NotFound";

function readStore(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
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
  const [items, setItems] = useState(() =>
    readStore("campusshare-items", SEED_ITEMS),
  );
  const [requests, setRequests] = useState(() =>
    readStore("campusshare-requests", SEED_REQUESTS),
  );
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();

  useEffect(
    () => localStorage.setItem("campusshare-items", JSON.stringify(items)),
    [items],
  );
  useEffect(
    () =>
      localStorage.setItem("campusshare-requests", JSON.stringify(requests)),
    [requests],
  );
  useEffect(() => setMobileMenu(false), [location.pathname]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const navItems = [
    { to: "/", label: "หน้าหลัก", icon: LayoutGrid, end: true },
    { to: "/create", label: "สร้างประกาศ", icon: PlusCircle },
    { to: "/my-listings", label: "ประกาศของฉัน", icon: ClipboardList },
    { to: "/requests", label: "คำขอยืมเข้า", icon: Inbox, count: pendingCount },
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
          <Avatar name="Ploy S." />
          <div>
            <strong>Ploy S.</strong>
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
            <Avatar name="Ploy S." size="sm" />
            <span>Ploy S.</span>
          </span>
        </header>

        <main className="page-container">
          <Routes>
            <Route path="/" element={<Browse items={items} />} />
            <Route
              path="/create"
              element={<CreateListing items={items} setItems={setItems} />}
            />
            <Route
              path="/items/:id"
              element={<ItemDetails items={items} setRequests={setRequests} />}
            />
            <Route
              path="/my-listings"
              element={<MyListings items={items} setItems={setItems} />}
            />
            <Route
              path="/requests"
              element={
                <IncomingRequests
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
