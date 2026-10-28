import { apiRequest, getApiPaths } from "./client";

const LEGACY_REQUESTS_PATH = "/api/borrow-requests";

function toDateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function normalizeBorrowRequest(raw, items = []) {
  if (!raw) return null;
  const itemId = raw.itemId || raw.item_id || "";
  const matchedItem = items.find((i) => i.id === itemId);
  return {
    id: raw.id || raw.requestId,
    itemId,
    itemName: raw.itemName || matchedItem?.name || itemId,
    borrower: raw.borrower || raw.borrowerName || raw.borrowerId || "",
    borrowerId: raw.borrowerId || "",
    borrowDate: toDateOnly(raw.borrowDate || raw.startDate),
    returnDate: toDateOnly(raw.returnDate || raw.endDate),
    reason: raw.reason || "",
    status: String(raw.status || "pending").toLowerCase(),
  };
}

export async function getBorrowRequests(user, token, items = []) {
  const { requests } = getApiPaths();
  const studentId = user?.studentId || user?.id;
  try {
    const list = await apiRequest(requests, {
      method: "GET",
      token,
    });
    return Array.isArray(list)
      ? list.map((r) => normalizeBorrowRequest(r, items))
      : [];
  } catch (err) {
    if (err.status === 404 && studentId) {
      const list = await apiRequest(
        `${LEGACY_REQUESTS_PATH}/borrower/${encodeURIComponent(studentId)}`,
        {
          method: "GET",
          token,
        },
      );
      return Array.isArray(list)
        ? list.map((r) => normalizeBorrowRequest(r, items))
        : [];
    }
    throw err;
  }
}

export async function createBorrowRequest(payload, token) {
  const { requests } = getApiPaths();
  try {
    return await apiRequest(requests, {
      method: "POST",
      body: {
        itemId: payload.itemId,
        borrowerId: payload.borrowerId,
        borrowDate: payload.startDate,
        returnDate: payload.endDate,
        reason: payload.reason,
      },
      token,
    });
  } catch (err) {
    if (err.status === 404) {
      const query = new URLSearchParams({
        borrowerId: payload.borrowerId,
        itemId: payload.itemId,
        startDate: `${payload.startDate}T00:00:00Z`,
        endDate: `${payload.endDate}T23:59:59Z`,
        ...(payload.reason ? { reason: payload.reason } : {}),
      });
      return apiRequest(`${LEGACY_REQUESTS_PATH}/request?${query.toString()}`, {
        method: "POST",
        token,
      });
    }
    throw err;
  }
}

export async function updateBorrowRequestStatus(
  id,
  status,
  { ownerId, reason = "" } = {},
  token,
) {
  const { requests } = getApiPaths();
  const normalizedStatus = String(status || "").toLowerCase();
  const action = normalizedStatus === "accepted" ? "ACCEPT" : "REJECT";

  try {
    return await apiRequest(`${requests}/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { action, status: normalizedStatus.toUpperCase(), ownerId, reason },
      token,
    });
  } catch (err) {
    if (err.status === 404) {
      const subAction = normalizedStatus === "accepted" ? "approve" : "reject";
      const query = ownerId
        ? `?ownerId=${encodeURIComponent(ownerId)}`
        : "";
      return apiRequest(
        `${LEGACY_REQUESTS_PATH}/${encodeURIComponent(id)}/${subAction}${query}`,
        {
          method: "POST",
          token,
        },
      );
    }
    throw err;
  }
}

export async function cancelBorrowRequest(id, token) {
  const { requests } = getApiPaths();
  try {
    return await apiRequest(`${requests}/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      token,
    });
  } catch (err) {
    if (err.status === 404) {
      return apiRequest(
        `${LEGACY_REQUESTS_PATH}/${encodeURIComponent(id)}/cancel`,
        {
          method: "POST",
          token,
        },
      );
    }
    throw err;
  }
}
