import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  LogIn,
  AlertCircle,
  UserCheck,
  Sparkles,
  KeyRound,
  UserRound,
} from "lucide-react";
import { PageHeading } from "../components/UI";
import { useAuth } from "../contexts/AuthContext";

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
const MAX_PASSWORD_LENGTH = 128;

export default function Login() {
  const { login, demoAccounts, demoEnabled, user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search || ""}`
    : "/";

  function resolveLoginError(err) {
    if (err?.status === 401) {
      return t("auth.invalidCredentials", {
        defaultValue:
          "รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      });
    }
    if (err?.status === 403) {
      return t("auth.accountInactive", {
        defaultValue:
          "บัญชีผู้ใช้ไม่อยู่ในสถานะพร้อมใช้งาน (พ้นสภาพ/พักการศึกษา/ลาออก) กรุณาติดต่อผู้ดูแลระบบ",
      });
    }
    if (err?.status === 429) {
      return t("auth.rateLimited", {
        defaultValue:
          "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง",
      });
    }
    return (
      err?.data?.message ||
      err?.message ||
      t("auth.loginFailed", { defaultValue: "เข้าสู่ระบบไม่สำเร็จ" })
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError(
        t("auth.missingCredentials", {
          defaultValue: "กรุณากรอกรหัสนักศึกษาและรหัสผ่านให้ครบถ้วน",
        }),
      );
      return;
    }
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError(
        t("auth.invalidUsernameFormat", {
          defaultValue:
            "รูปแบบรหัสนักศึกษา/ชื่อผู้ใช้ไม่ถูกต้อง (ต้องยาว 3–50 ตัวอักษร ใช้ได้เฉพาะตัวอักษร ตัวเลข . _ -)",
        }),
      );
      return;
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      setError(
        t("auth.passwordTooLong", {
          defaultValue: "รหัสผ่านยาวเกิน 128 ตัวอักษร",
        }),
      );
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedUsername, password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(resolveLoginError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickDemoLogin(account) {
    setError("");
    setUsername(account.studentId);
    setPassword(account.password);
    setSubmitting(true);
    try {
      await login(account.studentId, account.password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(resolveLoginError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isEn = i18n.language?.startsWith("en");

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <PageHeading
        eyebrow={t("auth.eyebrow", { defaultValue: "เข้าสู่ระบบ CAMPUSSHARE" })}
        title={t("auth.loginTitle", { defaultValue: "เข้าสู่ระบบ CampusShare" })}
        subtitle={
          demoEnabled
            ? t("auth.loginSubtitle", {
                defaultValue:
                  "เข้าสู่ระบบด้วยบัญชีนักศึกษา มหาวิทยาลัยธรรมศาสตร์ หรือเลือกบัญชีทดสอบด้านล่าง",
              })
            : t("auth.loginSubtitleProd", {
                defaultValue:
                  "เข้าสู่ระบบด้วยบัญชีและรหัสผ่าน มหาวิทยาลัยธรรมศาสตร์",
              })
        }
      />

      <div
        className={`grid grid-cols-1 gap-6 items-start ${
          demoEnabled && demoAccounts.length > 0 ? "lg:grid-cols-2" : "max-w-lg w-full mx-auto"
        }`}
      >
        <form
          className="flex flex-col p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex items-start gap-3.5 mb-5 pb-4 border-b border-[var(--border)]">
            <span className="w-8 h-8 rounded-lg bg-[var(--peach)] text-[var(--primary)] grid place-items-center shrink-0 mt-0.5">
              <KeyRound size={16} />
            </span>
            <div>
              <h2 className="m-0 text-base font-semibold text-[var(--text)]">
                {t("auth.credentialsHeading", {
                  defaultValue: "ยืนยันตัวตนด้วยบัญชีนักศึกษา",
                })}
              </h2>
              <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                {t("auth.credentialsSubheading", {
                  defaultValue:
                    "เข้าสู่ระบบด้วยรหัสนักศึกษาและรหัสผ่านของมหาวิทยาลัยธรรมศาสตร์",
                })}
              </p>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-4" role="alert">
              <AlertCircle size={17} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="login-username">
              {t("auth.usernameLabel", {
                defaultValue: "รหัสนักศึกษา / ชื่อผู้ใช้ (Student ID)",
              })}{" "}
              <span className="required">*</span>
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("auth.usernamePlaceholder", {
                defaultValue: "เช่น 6809000001",
              })}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">
              {t("auth.passwordLabel", { defaultValue: "รหัสผ่าน (Password)" })}{" "}
              <span className="required">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder", {
                defaultValue: "กรอกรหัสผ่านของคุณ",
              })}
              disabled={submitting}
            />
          </div>

          <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] text-xs leading-relaxed text-[var(--muted)]">
            <ShieldCheck size={17} className="shrink-0 mt-0.5 text-[var(--primary)]" />
            <span>
              {t("auth.securityNote", {
                defaultValue:
                  "การเข้าสู่ระบบของคุณปลอดภัยและได้รับการปกป้องตามมาตรฐานความปลอดภัย",
              })}
            </span>
          </div>

          <button
            type="submit"
            className="button button-primary button-full"
            disabled={submitting}
          >
            <LogIn size={17} />
            {submitting
              ? t("auth.signingIn", { defaultValue: "กำลังเข้าสู่ระบบ..." })
              : t("auth.signInBtn", { defaultValue: "เข้าสู่ระบบ" })}
          </button>
        </form>

        {demoEnabled && demoAccounts.length > 0 && (
          <section className="flex flex-col p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] shadow-xs">
            <div className="flex items-start gap-3.5 mb-5 pb-4 border-b border-[var(--border)]">
              <span className="w-8 h-8 rounded-lg bg-[var(--peach)] text-[var(--primary)] grid place-items-center shrink-0 mt-0.5">
                <Sparkles size={16} />
              </span>
              <div>
                <h2 className="m-0 text-base font-semibold text-[var(--text)]">
                  {t("auth.demoSwitcherTitle", {
                    defaultValue: "สลับบัญชีทดสอบด่วน (Quick Demo Accounts)",
                  })}
                </h2>
                <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                  {t("auth.demoSwitcherDesc", {
                    defaultValue:
                      "คลิกเพื่อเข้าสู่ระบบทันทีสำหรับทดสอบบทบาทผู้ให้ยืม (Owner) และผู้ขอยืม (Borrower)",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {demoAccounts.map((acc) => {
                const isCurrent = user?.studentId === acc.studentId;
                return (
                  <button
                    key={acc.studentId}
                    type="button"
                    className={`w-full flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrent
                        ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-xs"
                        : "bg-[var(--surface-subtle)] border-[var(--border)] text-[var(--text)] hover:border-[var(--primary)] hover:bg-[var(--surface-tint)]"
                    }`}
                    onClick={() => handleQuickDemoLogin(acc)}
                    disabled={submitting}
                  >
                    <div className="w-full flex items-center justify-between gap-2">
                      <strong className="text-[13.5px] font-semibold">
                        {acc.name} ({acc.studentId})
                      </strong>
                      {isCurrent ? (
                        <UserCheck size={16} className="shrink-0" />
                      ) : (
                        <UserRound size={16} className="shrink-0 opacity-75" />
                      )}
                    </div>
                    <small className={`text-xs ${isCurrent ? "text-white/90" : "text-[var(--muted)]"}`}>
                      {isEn ? acc.roleLabelEn : acc.roleLabelTh}
                    </small>
                    <small className={`text-[11px] ${isCurrent ? "text-white/80" : "text-[var(--muted)]"}`}>
                      {acc.faculty}
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
