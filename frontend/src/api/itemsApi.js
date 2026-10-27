import { apiRequest } from "./client";
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
  const list = await apiRequest(`/items?status=${encodeURIComponent(status)}`, {
    method: "GET",
    token,
  });
  return Array.isArray(list) ? list.map((item) => normalizeItem(item)) : [];
}

export async function getAllItems(token) {
  const list = await apiRequest("/items/all", {
    method: "GET",
    token,
  });
  return Array.isArray(list) ? list.map((item) => normalizeItem(item)) : [];
}

export async function createItem(studentId, formData, token) {
  return apiRequest(`/items/${encodeURIComponent(studentId)}`, {
    method: "POST",
    body: formData,
    token,
  });
}

export async function getItemById(id, token) {
  const raw = await apiRequest(`/items/${id}`, {
    method: "GET",
    token,
  });
  return normalizeItem(raw);
}