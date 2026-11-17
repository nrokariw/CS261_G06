import { apiRequest, getApiPaths } from "./client";

function normalizeCategory(raw) {
  if (!raw || !raw.code) return null;
  const code = String(raw.code).trim().toUpperCase();
  if (!code) return null;
  return {
    code,
    nameTh: raw.nameTh || code,
    nameEn: raw.nameEn || raw.nameTh || code,
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : 0,
    active: raw.active !== false,
  };
}

export async function getCategories({ includeInactive = true, token } = {}) {
  const { categories } = getApiPaths();
  const list = await apiRequest(
    `${categories}?includeInactive=${Boolean(includeInactive)}`,
    { method: "GET", token },
  );
  return Array.isArray(list) ? list.map(normalizeCategory).filter(Boolean) : [];
}

export async function createCategory(payload, token) {
  const { categories } = getApiPaths();
  const data = await apiRequest(categories, {
    method: "POST",
    body: payload,
    token,
  });
  return normalizeCategory(data);
}

export async function updateCategory(code, payload, token) {
  const { categories } = getApiPaths();
  const data = await apiRequest(`${categories}/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: payload,
    token,
  });
  return normalizeCategory(data);
}

export async function deleteCategory(code, { hard = false } = {}, token) {
  const { categories } = getApiPaths();
  return apiRequest(
    `${categories}/${encodeURIComponent(code)}?hard=${Boolean(hard)}`,
    {
      method: "DELETE",
      token,
    },
  );
}
