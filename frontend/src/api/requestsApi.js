import { apiRequest } from "./client";

export async function getBorrowRequests(token) {
  return apiRequest("/borrow-requests", {
    method: "GET",
    token,
  });
}

export async function createBorrowRequest(payload, token) {
  return apiRequest("/borrow-requests", {
    method: "POST",
    body: payload,
    token,
  });
}

export async function updateBorrowRequestStatus(id, status, token) {
  return apiRequest(`/borrow-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { status },
    token,
  });
}
