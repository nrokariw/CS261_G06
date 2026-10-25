import { apiRequest, getApiPaths } from "./client";
import { normalizeCategoryKey } from "../data";

export function normalizeItem(raw, fallbackOwner = "") {
  if (!raw) return null;
  return {
    id: raw.id || raw.itemId,
    name: raw.title ?? raw.name ?? "",
    category: normalizeCategoryKey(raw.category),
    detail: raw.description ?? raw.detail ?? "",
    image: raw.imageUrl ?? raw.image ?? "",
    owner: raw.owner ?? fallbackOwner ?? raw.ownerId ?? "",
    ownerId: raw.ownerId ?? "",
    status: String(raw.status || "available").toLowerCase(),
  };
}

export async function getAvailableItems(status = "AVAILABLE", token) {
  const { items } = getApiPaths();
  const list = await apiRequest(`${items}?status=${encodeURIComponent(status)}`, {
    method: "GET",
    token,
  });
  return Array.isArray(list) ? list.map((item) => normalizeItem(item)) : [];
}

export async function getAllItems(token) {
  const { items } = getApiPaths();
  try {
    const list = await apiRequest(`${items}/all`, {
      method: "GET",
      token,
    });
    return Array.isArray(list) ? list.map((item) => normalizeItem(item)) : [];
  } catch (err) {
    if (err.status === 404) {
      return getAvailableItems("AVAILABLE", token);
    }
    throw err;
  }
}

export async function createItem(studentId, formData, token) {
  const { items } = getApiPaths();
  try {
    return await apiRequest(`${items}/${encodeURIComponent(studentId)}`, {
      method: "POST",
      body: formData,
      token,
    });
  } catch (err) {
    if (err.status === 404) {
      return apiRequest(items, {
        method: "POST",
        body: formData,
        token,
      });
    }
    throw err;
  }
}

export async function updateItem(itemId, payload, token) {
  const { items } = getApiPaths();
  return apiRequest(`${items}/${encodeURIComponent(itemId)}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export async function deleteItem(itemId, token) {
  const { items } = getApiPaths();
  return apiRequest(`${items}/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    token,
  });
}
