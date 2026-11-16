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

// T-6.3: บันทึกหลักฐานการส่งมอบ (ขั้นตอนเดียว ตรงกับ backend: POST /api/transactions/{requestId}/handover-evidence)
// backend รับ multipart/form-data: imageFile (บังคับ), conditionNote (ไม่บังคับ)
// สำเร็จ → 201 พร้อม Transaction (สถานะ ACTIVE) และสิ่งของถูกเปลี่ยนเป็น BORROWED ฝั่ง backend แล้ว
export async function submitHandoverEvidence(requestId, { imageFile, conditionNote }, token) {
  const { transactions } = getApiPaths();
  const form = new FormData();
  form.append("imageFile", imageFile);
  form.append("conditionNote", conditionNote || "");
  return apiRequest(`${transactions}/${encodeURIComponent(requestId)}/handover-evidence`, {
    method: "POST",
    body: form,
    token,
  });
}

// T-6.3: ดึงธุรกรรมของสิ่งของ (GET /api/transactions/item/{itemId})
export async function getTransactionsByItem(itemId, token) {
  const { transactions } = getApiPaths();
  return apiRequest(`${transactions}/item/${encodeURIComponent(itemId)}`, {
    method: "GET",
    token,
  });
}

// T-6.3: หาธุรกรรมของคำขอสถานะ accepted จาก Transaction.requestId → { [requestId]: transaction }
// เนื่องจาก backend สร้าง Transaction พร้อมหลักฐานในขั้นตอนเดียว "มี Transaction" = "ส่งมอบแล้ว"
// (ถ้าดึงข้อมูลบางรายการไม่สำเร็จจะ throw เพื่อไม่ให้หน้าจอเข้าใจผิดว่ายังไม่ส่งมอบ)
export async function getRequestTransactionMap(requests, token) {
  const accepted = requests.filter((r) => r.status === "accepted");
  const itemIds = [...new Set(accepted.map((r) => r.itemId))];
  const lists = await Promise.all(itemIds.map((itemId) => getTransactionsByItem(itemId, token)));
  const acceptedIds = new Set(accepted.map((r) => String(r.id)));
  const map = {};
  lists.flat().forEach((tx) => {
    if (tx?.requestId && acceptedIds.has(String(tx.requestId))) map[tx.requestId] = tx;
  });
  return map;
}
