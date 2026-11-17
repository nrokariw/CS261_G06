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
import WantedPostDetails from "./pages/WantedPostDetails";
import LoanEvidenceTimelineModal from "./components/LoanEvidenceTimelineModal";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { loadRuntimeConfig } from "./api/client";
import { getAllItems, getAvailableItems } from "./api/itemsApi";
import { getBorrowRequests } from "./api/requestsApi";
import { getCategories } from "./api/categoriesApi";
import { getMyWantedPosts } from "./api/wantedPostsApi";
import { getActiveCategoryCodes, setRuntimeCategories } from "./data";

function BrandMark() {
  return (
    <img
      src="/icon.png"
      alt=""
      width={34}
      height={34}
      className="w-[34px] h-[34px] rounded-lg object-contain shrink-0"
      aria-hidden="true"
    />
  );
}

export default function App() {
  const { user, token, logout, demoAccounts, demoEnabled, quickSwitchAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [myWantedPosts, setMyWantedPosts] = useState([]);
  const [categories, setCategories] = useState(() => getActiveCategoryCodes());
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

      try {
        const loadedCategories = await getCategories({ includeInactive: true, token });
        if (!active) return;
        setRuntimeCategories(loadedCategories);
        setCategories(getActiveCategoryCodes());
      } catch {
        // Keep built-in defaults if category endpoint is unavailable
      }

      const loadedItems = await getAllItems(token)
        .catch(() => getAvailableItems("AVAILABLE", token))
        .catch(() => []);
      if (!active) return;
      setItems(loadedItems);

      if (user && token) {
        const [loadedRequests, loadedWantedPosts] = await Promise.all([
          getBorrowRequests(user, token, loadedItems).catch(() => []),
          getMyWantedPosts(token).catch(() => []),
        ]);
        if (!active) return;
        setRequests(loadedRequests);
        setMyWantedPosts(Array.isArray(loadedWantedPosts) ? loadedWantedPosts : []);
      } else {
        setRequests([]);
        setMyWantedPosts([]);
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
  const pendingOffersCount = user
    ? myWantedPosts.reduce(
        (sum, post) => sum + Number(post?.pendingOfferCount || 0),
        0,
      )
    : 0;
  const inboxCount = pendingCount + pendingOffersCount;
  const navItems = [
    { to: "/", label: t("nav.home"), icon: LayoutGrid, end: true },
    { to: "/create", label: t("nav.create"), icon: PlusCircle },
    { to: "/my-listings", label: t("nav.myListings"), icon: ClipboardList },
    { to: "/requests", label: t("nav.requests"), icon: Inbox, count: inboxCount },
    { to: "/my-borrows", label: t("nav.myBorrows"), icon: History },
  ];

  const { pathname, search } = location;
  let currentLabel = navItems.find((n) => n.to === pathname)?.label;
  if (pathname === "/create" && search.includes("edit="))
    currentLabel = t("nav.editListing");
  if (pathname.startsWith("/items/")) currentLabel = t("nav.itemDetails");
  if (pathname.startsWith("/wanted")) currentLabel = t("wanted.eyebrow");
  if (pathname.startsWith("/transactions/"))
    currentLabel = t("evidenceTimeline.title");
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
    <div className="min-h-screen grid lg:grid-cols-[256px_1fr] bg-[var(--background)] text-[var(--text)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] border-r border-[var(--border)] px-4 py-5 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileMenu ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <NavLink
          to="/"
          className="flex items-center gap-2.5 px-2.5 py-2 mb-5 no-underline text-[var(--text)]"
          aria-label={t("nav.brandAria")}
        >
          <BrandMark />
          <span className="text-[19px] font-bold tracking-tight text-[var(--text)]">
            CampusShare
          </span>
        </NavLink>
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto" aria-label={t("nav.mainMenuAria")}>
          {navItems.map(({ to, label, icon: Icon, end, count }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-[13.5px] font-medium no-underline transition-colors ${
                  isActive
                    ? "is-active bg-[var(--primary)] text-white shadow-xs"
                    : "text-[var(--sidebar-muted)] hover:bg-[var(--surface)]/70 hover:text-[var(--text)]"
                }`
              }
            >
              <Icon size={19} strokeWidth={1.75} className="shrink-0" />
              <span className="truncate">{label}</span>
              {count > 0 && (
                <b className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--primary)] text-white text-[11px] font-bold grid place-items-center group-[.is-active]:bg-white group-[.is-active]:text-[var(--primary)]">
                  {count}
                </b>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          {user ? (
            <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-[var(--surface)]/80 border border-[var(--border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={user.name} />
                <div className="min-w-0 flex-1 flex flex-col">
                  <strong
                    title={user.name}
                    className="text-[13px] font-semibold text-[var(--text)] truncate"
                  >
                    {user.name}
                  </strong>
                  <small
                    title={`${user.studentId} • ${t("nav.studentRole")}`}
                    className="text-[11px] text-[var(--muted)] truncate"
                  >
                    {user.studentId} • {t("nav.studentRole")}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="button button-outline button-sm button-full"
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
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] border-0 p-0 lg:hidden"
          aria-label={t("nav.closeMenu")}
          onClick={() => setMobileMenu(false)}
        />
      )}

      <div className="min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)]">
          <button
            className="lg:hidden inline-grid place-items-center w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shrink-0 cursor-pointer hover:border-[var(--primary)] transition-colors"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className="flex items-center gap-1.5 text-[13px] min-w-0 flex-1" aria-label={t("nav.breadcrumbAria")}>
            <Link
              to="/"
              className="hidden sm:inline text-[var(--muted)] hover:text-[var(--primary)] no-underline font-medium shrink-0"
            >
              CampusShare
            </Link>
            <ChevronRight size={15} aria-hidden="true" className="hidden sm:inline text-[var(--muted)] shrink-0" />
            <strong aria-current="page" className="font-semibold text-[var(--text)] truncate">
              {currentLabel}
            </strong>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="button button-outline button-sm w-9 h-9 p-0 rounded-full [&>svg]:transition-transform [&>svg]:duration-200 hover:[&>svg]:rotate-[25deg] hover:[&>svg]:scale-105"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("nav.switchToLight") : t("nav.switchToDark")}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              className="button button-outline button-sm h-9 px-2.5 rounded-full gap-1.5 font-bold tracking-wider [&>svg]:transition-transform [&>svg]:duration-450 hover:[&>svg]:rotate-[360deg] hover:[&>svg]:scale-110 active:scale-95"
              onClick={toggleLanguage}
              aria-label={t("nav.switchLanguage")}
              title={t("nav.switchLanguage")}
            >
              <Globe size={15} className="shrink-0" />
              <span
                className="inline-block animate-[langBadgePop_0.28s_cubic-bezier(0.34,1.56,0.64,1)_both]"
                key={i18n.language}
              >
                {isEn ? "EN" : "TH"}
              </span>
            </button>

            {!user && !demoEnabled ? (
              <Link to="/login" className="button button-primary button-sm">
                <LogIn size={15} />
                <span>{t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}</span>
              </Link>
            ) : (
              <div className="relative inline-flex" ref={profileMenuRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-[13px] font-medium cursor-pointer hover:border-[var(--primary)] transition-colors"
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
                      <span className="hidden min-[420px]:inline max-w-[140px] truncate">
                        {user.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Users size={15} />
                      <span className="hidden min-[420px]:inline max-w-[140px] truncate">
                        {t("nav.login", { defaultValue: "เข้าสู่ระบบ" })}
                      </span>
                    </>
                  )}
                  <ChevronDown
                    size={14}
                    className={`text-[var(--muted)] transition-transform duration-150 ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileMenuOpen && (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] w-80 max-w-[calc(100vw-24px)] bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xl p-3 z-50 flex flex-col gap-3"
                    role="menu"
                  >
                    {user ? (
                      <div className="flex items-start gap-3 pb-3 border-b border-[var(--border)]">
                        <Avatar name={user.name} />
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                          <strong className="text-[13.5px] font-semibold text-[var(--text)] truncate">
                            {user.fullName || user.name}
                          </strong>
                          <small className="text-[11px] text-[var(--muted)] truncate">
                            {user.username || user.studentId} •{" "}
                            {String(user.role).toUpperCase() === "STAFF"
                              ? t("nav.staffRole", { defaultValue: "บุคลากร" })
                              : t("nav.studentRole")}
                          </small>
                          {user.faculty && (
                            <small className="text-[11px] text-[var(--muted)] truncate">
                              {user.faculty}
                            </small>
                          )}
                          {user.department && (
                            <small className="text-[11px] text-[var(--muted)] truncate">
                              {user.department}
                            </small>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 pb-3 border-b border-[var(--border)]">
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                          <strong className="text-[13.5px] font-semibold text-[var(--text)]">
                            {t("auth.guestTitle", { defaultValue: "ยังไม่ได้เข้าสู่ระบบ" })}
                          </strong>
                          <small className="text-[11px] text-[var(--muted)] leading-snug">
                            {t("auth.guestSubtitle", {
                              defaultValue: "เลือกบัญชีทดสอบหรือเข้าสู่ระบบด้วยรหัสนักศึกษา",
                            })}
                          </small>
                        </div>
                      </div>
                    )}

                    {demoEnabled && demoAccounts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 px-1 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          <Users size={13} />
                          <span>
                            {t("auth.selectDemoAccount", {
                              defaultValue: "สลับบัญชีทดสอบ (Quick Switch)",
                            })}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                          {demoAccounts.map((acc) => {
                            const isCurrent = user?.studentId === acc.studentId;
                            return (
                              <button
                                key={acc.studentId}
                                type="button"
                                role="menuitem"
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                                  isCurrent
                                    ? "bg-[var(--surface-tint)] border-[var(--primary)]/50 text-[var(--text)]"
                                    : "bg-transparent border-transparent hover:bg-[var(--surface-subtle)] text-[var(--text)]"
                                }`}
                                onClick={() => handleQuickSwitch(acc.studentId)}
                                disabled={switchingAccount}
                              >
                                <Avatar name={acc.name} size="sm" />
                                <div className="min-w-0 flex-1 flex flex-col">
                                  <strong className="text-[12.5px] font-semibold text-[var(--text)] truncate">
                                    {acc.name}{" "}
                                    <small className="font-normal text-[var(--muted)]">
                                      ({acc.studentId})
                                    </small>
                                  </strong>
                                  <span className="text-[11px] text-[var(--muted)] truncate">
                                    {isEn
                                      ? acc.roleLabelEn || acc.faculty
                                      : acc.roleLabelTh || acc.faculty}
                                  </span>
                                </div>
                                {isCurrent && (
                                  <Check size={15} className="shrink-0 text-[var(--primary)]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[var(--border)]">
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

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          <Routes>
            <Route
              path="/"
              element={
                <Browse
                  items={items}
                  requests={requests}
                  categories={categories}
                  loading={itemsLoading}
                />
              }
            />
            <Route path="/login" element={<Login />} />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreateListing
                    items={items}
                    setItems={setItems}
                    categories={categories}
                  />
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
                    myWantedPosts={myWantedPosts}
                    setMyWantedPosts={setMyWantedPosts}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-borrows"
              element={
                <ProtectedRoute>
                  <MyBorrows
                    requests={requests}
                    items={items}
                    setItems={setItems}
                    setRequests={setRequests}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wanted"
              element={
                <Browse
                  items={items}
                  requests={requests}
                  categories={categories}
                  loading={itemsLoading}
                  initialTab="wanted"
                />
              }
            />
            <Route
              path="/wanted/create"
              element={
                <ProtectedRoute>
                  <CreateListing
                    items={items}
                    setItems={setItems}
                    categories={categories}
                    initialTab="wanted"
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wanted/:id"
              element={
                <WantedPostDetails
                  items={items}
                  setItems={setItems}
                  setRequests={setRequests}
                />
              }
            />
            <Route
              path="/transactions/:requestId/evidence"
              element={
                <ProtectedRoute>
                  <LoanEvidenceTimelineModal asPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <footer className="mt-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
          <span>CampusShare</span>
          <span>A campus community built on sharing.</span>
        </footer>
      </div>
    </div>
  );
}
