import { apiRequest, getApiPaths } from "./client";

function buildWantedBasePath() {
  return getApiPaths().wantedPosts;
}

export async function listWantedPosts(params = {}, token) {
  const searchParams = new URLSearchParams();
  if (params.category && params.category !== "ALL") {
    searchParams.set("category", params.category);
  }
  if (params.q && params.q.trim()) {
    searchParams.set("q", params.q.trim());
  }
  const qs = searchParams.toString();
  const path = `${buildWantedBasePath()}${qs ? `?${qs}` : ""}`;
  return apiRequest(path, { token });
}

export async function getMyWantedPosts(token) {
  return apiRequest(`${buildWantedBasePath()}/my`, { token });
}

export async function getWantedPost(id, token) {
  return apiRequest(`${buildWantedBasePath()}/${id}`, { token });
}

export async function createWantedPost(payload, token) {
  return apiRequest(buildWantedBasePath(), {
    method: "POST",
    body: payload,
    token,
  });
}

export async function updateWantedPost(id, payload, token) {
  return apiRequest(`${buildWantedBasePath()}/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export async function cancelWantedPost(id, token) {
  return apiRequest(`${buildWantedBasePath()}/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function createLendOffer(postId, payload, token) {
  return apiRequest(`${buildWantedBasePath()}/${postId}/offers`, {
    method: "POST",
    body: payload,
    token,
  });
}

export async function acceptLendOffer(postId, offerId, token) {
  return apiRequest(`${buildWantedBasePath()}/${postId}/offers/${offerId}/accept`, {
    method: "POST",
    token,
  });
}

export async function rejectLendOffer(postId, offerId, token) {
  return apiRequest(`${buildWantedBasePath()}/${postId}/offers/${offerId}/reject`, {
    method: "POST",
    token,
  });
}
