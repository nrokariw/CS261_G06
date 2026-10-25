import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="not-found">
      <div className="not-found-code">404</div>
      <div className="eyebrow">{t("notFoundPage.eyebrow")}</div>
      <h1>{t("notFoundPage.title")}</h1>
      <p>{t("notFoundPage.description")}</p>
      <Link to="/" className="button button-primary">
        {t("notFoundPage.backHome")}
      </Link>
    </div>
  );
}
