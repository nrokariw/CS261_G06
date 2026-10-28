import { apiRequest, getApiPaths } from "./client";

export async function startTransaction(requestId, token) {
  const { transactions } = getApiPaths();
  return apiRequest(`${transactions}/start/${encodeURIComponent(requestId)}`, {
    method: "POST",
    token,
  });
}

export async function completeTransaction(transactionId, token) {
  const { transactions } = getApiPaths();
  return apiRequest(
    `${transactions}/${encodeURIComponent(transactionId)}/complete`,
    {
      method: "POST",
      token,
    },
  );
}

export async function uploadHandoverProof(transactionId, payload, token) {
  const { transactions, evidence } = getApiPaths();
  try {
    return await apiRequest(
      `${transactions}/${encodeURIComponent(transactionId)}/handover-proof`,
      {
        method: "POST",
        body: payload,
        token,
      },
    );
  } catch (err) {
    if (err.status === 404) {
      return apiRequest(
        `${evidence}/transaction/${encodeURIComponent(transactionId)}`,
        {
          method: "POST",
          body: payload,
          token,
        },
      );
    }
    throw err;
  }
}

export async function uploadReturnProof(transactionId, payload, token) {
  const { transactions, evidence } = getApiPaths();
  try {
    return await apiRequest(
      `${transactions}/${encodeURIComponent(transactionId)}/return-proof`,
      {
        method: "POST",
        body: payload,
        token,
      },
    );
  } catch (err) {
    if (err.status === 404) {
      return apiRequest(
        `${evidence}/transaction/${encodeURIComponent(transactionId)}`,
        {
          method: "POST",
          body: payload,
          token,
        },
      );
    }
    throw err;
  }
}

export async function getTransactionProof(transactionId, token) {
  const { transactions } = getApiPaths();
  return apiRequest(
    `${transactions}/${encodeURIComponent(transactionId)}/proof`,
    {
      method: "GET",
      token,
    },
  );
}
