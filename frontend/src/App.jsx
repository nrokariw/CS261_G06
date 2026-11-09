import React, { useEffect, useRef, useState } from "react";
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
  ChevronDown,
  Check,
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
  const { user, token, logout, demoAccounts, demoEnabled, quickSwitchAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const profileMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function fetchInitialData() {
      setItemsLoading(true);
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
      setItemsLoading(false);
    }
    fetchInitialData();
    return () => {
      active = false;
    };
  }, [user, token]);

  useEffect(() => {
    setMobileMenu(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

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

  const isEn = i18n.language?.startsWith("en");
  const nextLanguage = isEn ? "th" : "en";

  const toggleLanguage = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !prefersReducedMotion
    ) {
      document.startViewTransition(() => {
        i18n.changeLanguage(nextLanguage);
      });
      return;
    }

    i18n.changeLanguage(nextLanguage);
  };

  async function handleQuickSwitch(selectedId) {
    if (!selectedId || selectedId === user?.studentId) {
      setProfileMenuOpen(false);
      return;
    }
    setSwitchingAccount(true);
    try {
      await quickSwitchAccount(selectedId);
      setProfileMenuOpen(false);
    } finally {
      setSwitchingAccount(false);
    }
  }

  async function handleLogout() {
    setProfileMenuOpen(false);
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
        <div className="sidebar-bottom">
          {user ? (
            <div className="sidebar-user-card">
              <div className="sidebar-user-info">
                <Avatar name={user.name} />
                <div className="sidebar-user-text">
                  <strong title={user.name}>
                    {user.name}
                  </strong>
                  <small title={`${user.studentId} • ${t("nav.studentRole")}`}>
                    {user.studentId} • {t("nav.studentRole")}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="button button-outline button-sm button-full sidebar-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>{t("nav.logout", { defaultValue: "ออกจากระบบ" })}</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="button button-primary button-sm button-full"
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
            <Link to="/" className="breadcrumb-root">CampusShare</Link>
            <ChevronRight size={15} aria-hidden="true" className="breadcrumb-sep" />
            <strong aria-current="page" className="breadcrumb-current">{currentLabel}</strong>
          </nav>
          <div className="top-user">
            <button
              type="button"
              className="button button-outline button-sm topbar-icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("nav.switchToLight") : t("nav.switchToDark")}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              className="button button-outline button-sm topbar-lang-btn"
              onClick={toggleLanguage}
              aria-label={t("nav.switchLanguage")}
              title={t("nav.switchLanguage")}
            >
              <Globe size={15} className="lang-icon" />
              <span className="lang-code" key={i18n.language}>
                {isEn ? "EN" : "TH"}
              </span>
            </button>

            {!user && !demoEnabled ? (
              <Link to="/login" className="button button-primary button-sm">
                <LogIn size={15} />
                <span>{t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}</span>
              </Link>
            ) : (
              <div className="profile-menu-wrapper" ref={profileMenuRef}>
                <button
                  type="button"
                  className="profile-trigger-btn"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label={t("auth.accountMenuAria", {
                    defaultValue: "เมนูบัญชีผู้ใช้และสลับบัญชี",
                  })}
                >
                  {user ? (
                    <>
                      <Avatar name={user.name} size="sm" />
                      <span className="profile-trigger-name">{user.name}</span>
                    </>
                  ) : (
                    <>
                      <Users size={15} />
                      <span className="profile-trigger-name">
                        {t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}
                      </span>
                    </>
                  )}
                  <ChevronDown size={14} className={`profile-chevron ${profileMenuOpen ? "open" : ""}`} />
                </button>

                {profileMenuOpen && (
                  <div className="profile-popover" role="menu">
                    {user ? (
                      <div className="profile-popover-header">
                        <Avatar name={user.name} />
                        <div className="profile-popover-user">
                          <strong>{user.name}</strong>
                          <small>{user.studentId} • {t("nav.studentRole")}</small>
                          {user.faculty && <small>{user.faculty}</small>}
                        </div>
                      </div>
                    ) : (
                      <div className="profile-popover-header">
                        <div className="profile-popover-user">
                          <strong>{t("auth.guestTitle", { defaultValue: "ยังไม่ได้เข้าสู่ระบบ" })}</strong>
                          <small>
                            {t("auth.guestSubtitle", {
                              defaultValue: "เลือกบัญชีทดสอบหรือเข้าสู่ระบบด้วยรหัสนักศึกษา",
                            })}
                          </small>
                        </div>
                      </div>
                    )}

                    {demoEnabled && demoAccounts.length > 0 && (
                      <div className="profile-popover-section">
                        <div className="profile-popover-label">
                          <Users size={13} />
                          <span>
                            {t("auth.selectDemoAccount", {
                              defaultValue: "สลับบัญชีทดสอบ (Quick Switch)",
                            })}
                          </span>
                        </div>
                        <div className="profile-demo-list">
                          {demoAccounts.map((acc) => {
                            const isCurrent = user?.studentId === acc.studentId;
                            return (
                              <button
                                key={acc.studentId}
                                type="button"
                                role="menuitem"
                                className={`profile-demo-item ${isCurrent ? "active" : ""}`}
                                onClick={() => handleQuickSwitch(acc.studentId)}
                                disabled={switchingAccount}
                              >
                                <Avatar name={acc.name} size="sm" />
                                <div className="profile-demo-meta">
                                  <strong>
                                    {acc.name} <small>({acc.studentId})</small>
                                  </strong>
                                  <span>
                                    {isEn
                                      ? acc.roleLabelEn || acc.faculty
                                      : acc.roleLabelTh || acc.faculty}
                                  </span>
                                </div>
                                {isCurrent && <Check size={15} className="profile-demo-check" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="profile-popover-footer">
                      {user ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="button button-outline button-sm button-full"
                          onClick={handleLogout}
                        >
                          <LogOut size={15} />
                          <span>{t("nav.logout", { defaultValue: "ออกจากระบบ" })}</span>
                        </button>
                      ) : (
                        <Link
                          to="/login"
                          role="menuitem"
                          className="button button-primary button-sm button-full"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <LogIn size={15} />
                          <span>{t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="page-container">
          <Routes>
            <Route
              path="/"
              element={
                <Browse
                  items={items}
                  requests={requests}
                  loading={itemsLoading}
                />
              }
            />
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
