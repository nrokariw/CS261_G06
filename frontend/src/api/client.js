const DEFAULT_API_PATHS = {
  base: import.meta.env.VITE_API_BASE_PATH || "/api",
  auth: import.meta.env.VITE_API_AUTH_PATH || "/api/auth",
  items: import.meta.env.VITE_API_ITEMS_PATH || "/api/items",
  requests: import.meta.env.VITE_API_REQUESTS_PATH || "/api/requests",
  users: import.meta.env.VITE_API_USERS_PATH || "/api/users",
  transactions:
    import.meta.env.VITE_API_TRANSACTIONS_PATH || "/api/transactions",
  evidence: import.meta.env.VITE_API_EVIDENCE_PATH || "/api/evidence",
};

let runtimeApiPaths = { ...DEFAULT_API_PATHS };
let configLoaded = false;

export async function loadRuntimeConfig() {
  if (configLoaded) return runtimeApiPaths;
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.api) {
        runtimeApiPaths = {
          base: data.api.base || DEFAULT_API_PATHS.base,
          auth: data.api.auth || DEFAULT_API_PATHS.auth,
          items: data.api.items || DEFAULT_API_PATHS.items,
          requests: data.api.requests || DEFAULT_API_PATHS.requests,
          users: data.api.users || DEFAULT_API_PATHS.users,
          transactions:
            data.api.transactions || DEFAULT_API_PATHS.transactions,
          evidence: data.api.evidence || DEFAULT_API_PATHS.evidence,
        };
      }
    }
  } catch {
    // Use build-time .env defaults when /config.json is absent in local dev
  } finally {
    configLoaded = true;
  }
  return runtimeApiPaths;
}

export function getApiPaths() {
  return runtimeApiPaths;
}

function getAuthToken(customToken) {
  return customToken || localStorage.getItem("token") || "Mock-jwt-token-123";
}

export async function apiRequest(endpoint, options = {}) {
  const { token, headers = {}, body, ...rest } = options;
  const isFormData = body instanceof FormData;

  const requestHeaders = {
    Authorization: `Bearer ${getAuthToken(token)}`,
    ...headers,
  };

  if (!isFormData && body !== undefined && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const basePath = runtimeApiPaths.base || "/api";
  const url =
    endpoint.startsWith("http") || endpoint.startsWith(basePath)
      ? endpoint
      : `${basePath}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    body:
      !isFormData && body !== undefined && typeof body !== "string"
        ? JSON.stringify(body)
        : body,
  });

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    let errData = {};
    try {
      errData = rawText ? JSON.parse(rawText) : {};
    } catch {
      errData = { message: rawText };
    }
    const error = new Error(
      errData.message || errData.error || `Request failed (${response.status})`,
    );
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
