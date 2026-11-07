import { apiRequest, getApiPaths } from "./client";

export async function loginWithTuAccount(username, password) {
  const { auth } = getApiPaths();
  return apiRequest(`${auth}/login`, {
    method: "POST",
    body: { username, password },
  });
}

export async function refreshAuthSession() {
  const { auth } = getApiPaths();
  return apiRequest(`${auth}/refresh`, {
    method: "POST",
  });
}

export async function logoutAuthSession() {
  const { auth } = getApiPaths();
  return apiRequest(`${auth}/logout`, {
    method: "POST",
  });
}

export async function getCurrentUserProfile(token) {
  const { auth } = getApiPaths();
  return apiRequest(`${auth}/me`, {
    method: "GET",
    token,
  });
}

export async function fetchDemoAccounts() {
  const { auth } = getApiPaths();
  return apiRequest(`${auth}/demo-accounts`, {
    method: "GET",
  });
}

export async function getUserByStudentId(studentId, token) {
  const { users } = getApiPaths();
  return apiRequest(`${users}/${encodeURIComponent(studentId)}`, {
    method: "GET",
    token,
  });
}

export async function getAllUsers(token) {
  const { users } = getApiPaths();
  return apiRequest(users, {
    method: "GET",
    token,
  });
}

export async function createUser(userPayload, token) {
  const { users } = getApiPaths();
  return apiRequest(users, {
    method: "POST",
    body: userPayload,
    token,
  });
}
