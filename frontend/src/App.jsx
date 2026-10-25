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
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEED_ITEMS, SEED_REQUESTS } from "./data";
import { Avatar } from "./components/UI";
import Browse from "./pages/Browse";
import CreateListing from "./pages/CreateListing";
import ItemDetails from "./pages/ItemDetails";
import MyListings from "./pages/MyListings";
import IncomingRequests from "./pages/IncomingRequests";
import NotFound from "./pages/NotFound";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";

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
      <circle cx="12.5" cy="17" r="10" fill="var(--accent)" />
      <circle cx="21.5" cy="17" r="10" fill="var(--primary)" fillOpacity=".92" />
    </svg>
  );
}

export default function App() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
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
    { to: "/", label: t("nav.home"), icon: LayoutGrid, end: true },
    { to: "/create", label: t("nav.create"), icon: PlusCircle },
    { to: "/my-listings", label: t("nav.myListings"), icon: ClipboardList },
    { to: "/requests", label: t("nav.requests"), icon: Inbox, count: pendingCount },
  ];

  const { pathname, search } = location;
  let currentLabel = navItems.find((n) => n.to === pathname)?.label;
  if (pathname === "/create" && search.includes("edit="))
    currentLabel = t("nav.editListing");
  if (pathname.startsWith("/items/")) currentLabel = t("nav.itemDetails");
  if (!currentLabel) currentLabel = t("nav.notFound");

  const nextLanguage = i18n.language === "en" ? "th" : "en";

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
            <button
              type="button"
              className="button button-outline button-sm"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              className="button button-outline button-sm"
              onClick={() => i18n.changeLanguage(nextLanguage)}
              aria-label="Switch language"
            >
              <Globe size={15} />
              <span>{i18n.language === "en" ? "EN" : "TH"}</span>
            </button>
            <Avatar name={user.name} size="sm" />
            <span>{user.name}</span>
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
