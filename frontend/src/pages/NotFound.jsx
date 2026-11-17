import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3 max-w-lg mx-auto">
      <div className="text-6xl font-extrabold tracking-tight text-[var(--primary)]">
        404
      </div>
      <div className="eyebrow">{t("notFoundPage.eyebrow")}</div>
      <h1 className="m-0 text-2xl font-bold text-[var(--text)]">
        {t("notFoundPage.title")}
      </h1>
      <p className="m-0 mb-2 text-sm text-[var(--muted)] leading-relaxed">
        {t("notFoundPage.description")}
      </p>
      <Link to="/" className="button button-primary">
        {t("notFoundPage.backHome")}
      </Link>
    </div>
  );
}
