const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || "/api";

function getAuthToken(customToken) {
  return customToken || localStorage.getItem("token") || "demo-token";
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

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_PATH}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
    body:
      !isFormData && body !== undefined && typeof body !== "string"
        ? JSON.stringify(body)
        : body,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
