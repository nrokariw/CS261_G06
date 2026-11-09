export function formatDate(date, language = "th") {
  if (!date) return "—";
  const dateStr = String(date);
  const parsed = dateStr.includes("T")
    ? new Date(dateStr)
    : new Date(`${dateStr}T12:00:00`);
  if (isNaN(parsed.getTime())) return dateStr;
  const locale = language.startsWith("en") ? "en-US" : "th-TH";
  return parsed.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
