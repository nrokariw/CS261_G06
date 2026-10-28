import { apiRequest, getApiPaths } from "./client";

export async function loginWithTuAccount(username, password) {
  const { auth } = getApiPaths();
  return apiRequest(`${auth}/login`, {
    method: "POST",
    body: { username, password },
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
