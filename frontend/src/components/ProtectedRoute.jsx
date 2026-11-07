import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (authLoading) {
    return (
      <div className="page-stack">
        <p>{t("auth.checkingSession", { defaultValue: "กำลังตรวจสอบสถานะการเข้าสู่ระบบ..." })}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
