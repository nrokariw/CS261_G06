import React, { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
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
  History,
  LogIn,
  LogOut,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar } from "./components/UI";
import ProtectedRoute from "./components/ProtectedRoute";
import Browse from "./pages/Browse";
import CreateListing from "./pages/CreateListing";
import ItemDetails from "./pages/ItemDetails";
import MyListings from "./pages/MyListings";
import IncomingRequests from "./pages/IncomingRequests";
import MyBorrows from "./pages/MyBorrows";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { loadRuntimeConfig } from "./api/client";
import { getAllItems, getAvailableItems } from "./api/itemsApi";
import { getBorrowRequests } from "./api/requestsApi";

function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="12.5" cy="17" r="10" fill="var(--accent)" />
      <circle cx="21.5" cy="17" r="10" fill="var(--primary)" fillOpacity=".92" />
    </svg>
  );
}

export default function App() {
  const { user, token, logout, demoAccounts, quickSwitchAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function fetchInitialData() {
      await loadRuntimeConfig();

      const loadedItems = await getAllItems(token)
        .catch(() => getAvailableItems("AVAILABLE", token))
        .catch(() => []);
      if (!active) return;
      setItems(loadedItems);

      if (user && token) {
        const loadedRequests = await getBorrowRequests(
          user,
          token,
          loadedItems,
        ).catch(() => []);
        if (!active) return;
        setRequests(loadedRequests);
      } else {
        setRequests([]);
      }
    }
    fetchInitialData();
    return () => {
      active = false;
    };
  }, [user, token]);

  useEffect(() => setMobileMenu(false), [location.pathname]);

  const pendingCount = user
    ? requests.filter((r) => {
        if (r.status !== "pending") return false;
        const matchedItem = items.find((i) => String(i.id) === String(r.itemId));
        const ownerId = r.ownerId || matchedItem?.ownerId;
        const ownerName = r.owner || matchedItem?.owner;
        return Boolean(
          (user?.studentId && String(ownerId) === String(user.studentId)) ||
          (user?.id && String(ownerId) === String(user.id)) ||
          (user?.name && ownerName === user.name)
        );
      }).length
    : 0;
  const navItems = [
    { to: "/", label: t("nav.home"), icon: LayoutGrid, end: true },
    { to: "/create", label: t("nav.create"), icon: PlusCircle },
    { to: "/my-listings", label: t("nav.myListings"), icon: ClipboardList },
    { to: "/requests", label: t("nav.requests"), icon: Inbox, count: pendingCount },
    { to: "/my-borrows", label: t("nav.myBorrows"), icon: History },
  ];

  const { pathname, search } = location;
  let currentLabel = navItems.find((n) => n.to === pathname)?.label;
  if (pathname === "/create" && search.includes("edit="))
    currentLabel = t("nav.editListing");
  if (pathname.startsWith("/items/")) currentLabel = t("nav.itemDetails");
  if (pathname === "/login")
    currentLabel = t("nav.login", { defaultValue: "เข้าสู่ระบบ" });
  if (!currentLabel) currentLabel = t("nav.notFound");

  const nextLanguage = i18n.language === "en" ? "th" : "en";

  async function handleAccountSelect(e) {
    const selectedId = e.target.value;
    if (!selectedId || selectedId === user?.studentId) return;
    setSwitchingAccount(true);
    try {
      await quickSwitchAccount(selectedId);
    } finally {
      setSwitchingAccount(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <NavLink to="/" className="brand" aria-label={t("nav.brandAria")}>
          <BrandMark />
          <span className="brand-name">CampusShare</span>
        </NavLink>
        <nav className="side-nav" aria-label={t("nav.mainMenuAria")}>
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
        <div className="sidebar-bottom" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
          {user ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Avatar name={user.name} />
                <div style={{ overflow: "hidden" }}>
                  <strong style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.name}
                  </strong>
                  <small style={{ display: "block", opacity: 0.8 }}>
                    {user.studentId} • {t("nav.studentRole")}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="button button-outline button-sm"
                onClick={handleLogout}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <LogOut size={15} />
                <span>{t("nav.logout", { defaultValue: "ออกจากระบบ" })}</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="button button-primary button-sm"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <LogIn size={15} />
              <span>{t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}</span>
            </Link>
          )}
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="scrim"
          aria-label={t("nav.closeMenu")}
          onClick={() => setMobileMenu(false)}
        />
      )}

      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className="breadcrumbs" aria-label={t("nav.breadcrumbAria")}>
            <Link to="/">CampusShare</Link>
            <ChevronRight size={15} aria-hidden="true" />
            <strong aria-current="page">{currentLabel}</strong>
          </nav>
          <span className="top-user" style={{ gap: "8px", flexWrap: "wrap" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
              }}
              title={t("auth.quickSwitchTooltip", {
                defaultValue: "สลับบัญชีทดสอบอย่างรวดเร็ว",
              })}
            >
              <Users size={15} />
              <select
                aria-label={t("auth.quickSwitchAria", {
                  defaultValue: "สลับบัญชีทดสอบ",
                })}
                value={user?.studentId || ""}
                onChange={handleAccountSelect}
                disabled={switchingAccount}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  background: "var(--surface, transparent)",
                  color: "inherit",
                  border: "1px solid var(--border, #d1d5db)",
                }}
              >
                <option value="" disabled>
                  {t("auth.selectDemoAccount", {
                    defaultValue: "สลับบัญชีทดสอบ...",
                  })}
                </option>
                {demoAccounts.map((acc) => (
                  <option key={acc.studentId} value={acc.studentId}>
                    {acc.name} ({acc.studentId})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="button button-outline button-sm"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("nav.switchToLight") : t("nav.switchToDark")}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              className="button button-outline button-sm"
              onClick={() => i18n.changeLanguage(nextLanguage)}
              aria-label={t("nav.switchLanguage")}
            >
              <Globe size={15} />
              <span>{i18n.language === "en" ? "EN" : "TH"}</span>
            </button>
            {user ? (
              <>
                <Avatar name={user.name} size="sm" />
                <span>
                  {user.name} <small style={{ opacity: 0.75 }}>({user.studentId})</small>
                </span>
                <button
                  type="button"
                  className="button button-outline button-sm"
                  onClick={handleLogout}
                  title={t("nav.logout", { defaultValue: "ออกจากระบบ" })}
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <Link to="/login" className="button button-primary button-sm">
                <LogIn size={15} />
                <span>{t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}</span>
              </Link>
            )}
          </span>
        </header>

        <main className="page-container">
          <Routes>
            <Route path="/" element={<Browse />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreateListing items={items} setItems={setItems} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items/:id"
              element={<ItemDetails items={items} setRequests={setRequests} />}
            />
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute>
                  <MyListings items={items} setItems={setItems} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute>
                  <IncomingRequests
                    requests={requests}
                    setRequests={setRequests}
                    setItems={setItems}
                    items={items}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-borrows"
              element={
                <ProtectedRoute>
                  <MyBorrows requests={requests} />
                </ProtectedRoute>
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
