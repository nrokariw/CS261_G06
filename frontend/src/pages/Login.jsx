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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError(
        t("auth.missingCredentials", {
          defaultValue: "กรุณากรอกรหัสนักศึกษาและรหัสผ่านให้ครบถ้วน",
        }),
      );
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err?.status === 401) {
        setError(
          t("auth.invalidCredentials", {
            defaultValue:
              "รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
          }),
        );
      } else {
        setError(
          err?.data?.message ||
            err?.message ||
            t("auth.loginFailed", { defaultValue: "เข้าสู่ระบบไม่สำเร็จ" }),
        );
      }
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
      setError(
        err?.data?.message ||
          err?.message ||
          t("auth.loginFailed", { defaultValue: "เข้าสู่ระบบไม่สำเร็จ" }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isEn = i18n.language?.startsWith("en");

  return (
    <div className="page-stack narrow-page">
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

      <div className="login-grid">
        <form className="form-card" onSubmit={handleSubmit} noValidate>
          <div className="form-section-title">
            <span className="section-number">
              <KeyRound size={16} />
            </span>
            <div>
              <h2>
                {t("auth.credentialsHeading", {
                  defaultValue: "ยืนยันตัวตนด้วยบัญชีนักศึกษา",
                })}
              </h2>
              <p>
                {t("auth.credentialsSubheading", {
                  defaultValue:
                    "เข้าสู่ระบบด้วยรหัสนักศึกษาและรหัสผ่านของมหาวิทยาลัยธรรมศาสตร์",
                })}
              </p>
            </div>
          </div>

          {error && (
            <div
              className="alert alert-error"
              role="alert"
              style={{
                background: "#FCE8E4",
                color: "#B9382B",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={17} />
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

          <div className="borrow-note" style={{ marginBottom: "16px" }}>
            <ShieldCheck size={17} />
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
          <section className="form-card" style={{ marginTop: "20px" }}>
            <div className="form-section-title">
              <span className="section-number">
                <Sparkles size={16} />
              </span>
              <div>
                <h2>
                  {t("auth.demoSwitcherTitle", {
                    defaultValue: "สลับบัญชีทดสอบด่วน (Quick Demo Accounts)",
                  })}
                </h2>
                <p>
                  {t("auth.demoSwitcherDesc", {
                    defaultValue:
                      "คลิกเพื่อเข้าสู่ระบบทันทีสำหรับทดสอบบทบาทผู้ให้ยืม (Owner) และผู้ขอยืม (Borrower)",
                  })}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              {demoAccounts.map((acc) => {
                const isCurrent = user?.studentId === acc.studentId;
                return (
                  <button
                    key={acc.studentId}
                    type="button"
                    className={
                      isCurrent
                        ? "button button-primary"
                        : "button button-outline"
                    }
                    onClick={() => handleQuickDemoLogin(acc)}
                    disabled={submitting}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "4px",
                      padding: "14px 16px",
                      textAlign: "left",
                      height: "auto",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        justifyContent: "space-between",
                      }}
                    >
                      <strong>
                        {acc.name} ({acc.studentId})
                      </strong>
                      {isCurrent ? (
                        <UserCheck size={16} />
                      ) : (
                        <UserRound size={16} />
                      )}
                    </div>
                    <small style={{ opacity: 0.85 }}>
                      {isEn ? acc.roleLabelEn : acc.roleLabelTh}
                    </small>
                    <small style={{ opacity: 0.7 }}>{acc.faculty}</small>
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
