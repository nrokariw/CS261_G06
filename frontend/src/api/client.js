const DEFAULT_APP_ENV = (import.meta.env.VITE_APP_ENV || "demo")
  .trim()
  .toLowerCase();

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

let runtimeAppEnv = DEFAULT_APP_ENV;
let runtimeApiPaths = { ...DEFAULT_API_PATHS };
let configLoaded = false;
let refreshPromise = null;
let authCallbacks = {
  onTokenRefreshed: null,
  onSessionExpired: null,
};

export function registerAuthCallbacks(callbacks = {}) {
  authCallbacks = {
    ...authCallbacks,
    ...callbacks,
  };
}

export async function loadRuntimeConfig() {
  if (configLoaded) return runtimeApiPaths;
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.appEnv && typeof data.appEnv === "string") {
        const cleanedEnv = data.appEnv.trim().toLowerCase();
        if (cleanedEnv && !cleanedEnv.startsWith("$")) {
          runtimeAppEnv = cleanedEnv;
        }
      }
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

export function getAppEnv() {
  return runtimeAppEnv || "demo";
}

export function isProdEnv(envOverride) {
  const env = (envOverride || getAppEnv() || "demo").trim().toLowerCase();
  return env === "prod" || env === "production";
}

export function getApiPaths() {
  return runtimeApiPaths;
}

function getAuthToken(customToken) {
  if (customToken) return customToken;
  try {
    return localStorage.getItem("token") || null;
  } catch {
    return null;
  }
}

function buildUrl(endpoint) {
  const basePath = runtimeApiPaths.base || "/api";
  return endpoint.startsWith("http") || endpoint.startsWith(basePath)
    ? endpoint
    : `${basePath}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

function isAuthLifecycleEndpoint(url) {
  return (
    url.endsWith("/auth/login") ||
    url.endsWith("/auth/refresh") ||
    url.endsWith("/auth/logout")
  );
}

async function performSilentRefresh() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const { auth } = getApiPaths();
  const refreshUrl = buildUrl(`${auth}/refresh`);

  refreshPromise = (async () => {
    try {
      const res = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error(`Refresh failed (${res.status})`);
      }
      const data = await res.json();
      const nextToken = data?.accessToken || data?.token || null;
      if (!nextToken) {
        throw new Error("Missing accessToken in refresh response");
      }
      try {
        localStorage.setItem("token", nextToken);
      } catch {
        // Ignore storage errors
      }
      if (authCallbacks.onTokenRefreshed) {
        authCallbacks.onTokenRefreshed(
          nextToken,
          data?.user || data?.userProfile || null,
        );
      }
      return nextToken;
    } catch (err) {
      try {
        localStorage.removeItem("token");
      } catch {
        // Ignore storage errors
      }
      if (authCallbacks.onSessionExpired) {
        authCallbacks.onSessionExpired();
      }
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest(endpoint, options = {}) {
  const { token, headers = {}, body, _retried = false, ...rest } = options;
  const isFormData = body instanceof FormData;

  const activeToken = getAuthToken(token);
  const requestHeaders = {
    ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    ...headers,
  };

  if (!isFormData && body !== undefined && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const url = buildUrl(endpoint);

  const response = await fetch(url, {
    credentials: "include",
    ...rest,
    headers: requestHeaders,
    body:
      !isFormData && body !== undefined && typeof body !== "string"
        ? JSON.stringify(body)
        : body,
  });

  if (response.status === 401 && !_retried && !isAuthLifecycleEndpoint(url)) {
    try {
      const refreshedToken = await performSilentRefresh();
      if (refreshedToken) {
        return apiRequest(endpoint, {
          ...options,
          token: refreshedToken,
          _retried: true,
        });
      }
    } catch {
      // Fall through to standard 401 error handling below
    }
  }

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    let errData = {};
    try {
      errData = rawText ? JSON.parse(rawText) : {};
    } catch {
      errData = { message: rawText };
    }
    const baseMsg =
      errData.message || errData.error || `Request failed (${response.status})`;
    const detailSuffix =
      errData.detail && errData.detail !== baseMsg
        ? ` — ${errData.detail}`
        : "";
    const error = new Error(
      `[HTTP ${response.status}] ${baseMsg}${detailSuffix}`,
    );
    error.status = response.status;
    error.data = errData;
    console.error(`[API Error] ${rest.method || "GET"} ${url}:`, {
      status: response.status,
      ...errData,
    });
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
