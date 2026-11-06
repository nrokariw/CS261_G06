import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  fetchDemoAccounts,
  getCurrentUserProfile,
  loginWithTuAccount,
  logoutAuthSession,
  refreshAuthSession,
} from "../api/authApi";
import {
  getAppEnv,
  isProdEnv,
  loadRuntimeConfig,
  registerAuthCallbacks,
} from "../api/client";

export function normalizeUserProfile(raw) {
  if (!raw) return null;
  const source = raw.user || raw.userProfile || raw;
  const studentId = source.studentId || source.username || source.id || "";
  if (!studentId) return null;
  const fullName = source.fullName || source.name || studentId;
  return {
    id: studentId,
    studentId,
    username: source.username || studentId,
    name: fullName,
    fullName,
    email: source.email || "",
    faculty: source.faculty || "",
    department: source.department || "",
    role: source.role || "STUDENT",
    authProvider: source.authProvider || "LOCAL",
  };
}

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? normalizeUserProfile(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("token") || null;
    } catch {
      return null;
    }
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [appEnv, setAppEnv] = useState(() => getAppEnv());
  const [demoAccounts, setDemoAccounts] = useState([]);

  const persistSession = useCallback((nextToken, nextUser) => {
    const normalized = normalizeUserProfile(nextUser);
    setToken(nextToken || null);
    setUser(normalized);
    try {
      if (nextToken) {
        localStorage.setItem("token", nextToken);
      } else {
        localStorage.removeItem("token");
      }
      if (normalized) {
        localStorage.setItem("user", JSON.stringify(normalized));
      } else {
        localStorage.removeItem("user");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const clearSession = useCallback(() => {
    persistSession(null, null);
  }, [persistSession]);

  useEffect(() => {
    registerAuthCallbacks({
      onTokenRefreshed: (newToken, refreshedUser) => {
        setToken(newToken);
        if (refreshedUser) {
          const normalized = normalizeUserProfile(refreshedUser);
          setUser(normalized);
          try {
            localStorage.setItem("user", JSON.stringify(normalized));
          } catch {
            // Ignore storage errors
          }
        }
      },
      onSessionExpired: () => {
        clearSession();
      },
    });
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    async function initializeAuth() {
      try {
        await loadRuntimeConfig();
        const resolvedEnv = getAppEnv();
        if (active) {
          setAppEnv(resolvedEnv);
        }

        if (!isProdEnv(resolvedEnv)) {
          try {
            const demoData = await fetchDemoAccounts();
            if (active && demoData) {
              if (demoData.appEnv) {
                setAppEnv(String(demoData.appEnv).trim().toLowerCase());
              }
              if (demoData.demoEnabled === false || isProdEnv(demoData.appEnv)) {
                setDemoAccounts([]);
              } else if (Array.isArray(demoData.accounts)) {
                setDemoAccounts(demoData.accounts);
              }
            }
          } catch {
            // Ignore if demo-accounts endpoint is unreachable
          }
        } else if (active) {
          setDemoAccounts([]);
        }

        const savedToken = localStorage.getItem("token");
        if (savedToken) {
          try {
            const meData = await getCurrentUserProfile(savedToken);
            if (!active) return;
            const currentToken = localStorage.getItem("token") || savedToken;
            persistSession(currentToken, meData);
            return;
          } catch {
            // If /me + silent refresh both failed, clear stale session
          }
        }
        // Attempt cookie-based silent refresh if refresh_token HttpOnly cookie exists
        try {
          const refreshed = await refreshAuthSession();
          if (!active) return;
          const nextToken = refreshed?.accessToken || refreshed?.token;
          const nextUser = refreshed?.user || refreshed?.userProfile;
          if (nextToken && nextUser) {
            persistSession(nextToken, nextUser);
            return;
          }
        } catch {
          // Guest session (not logged in)
        }
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }
    initializeAuth();
    return () => {
      active = false;
    };
  }, [clearSession, persistSession]);

  const login = async (username, password) => {
    const data = await loginWithTuAccount(username, password);
    const nextToken = data?.accessToken || data?.token;
    const nextUser = data?.user || data?.userProfile;
    if (!nextToken || !nextUser) {
      throw new Error("Invalid authentication response from server");
    }
    persistSession(nextToken, nextUser);
    return data;
  };

  const quickSwitchAccount = async (studentId) => {
    const target = demoAccounts.find((acc) => acc.studentId === studentId);
    const pwd = target?.password || "password123";
    return login(studentId, pwd);
  };

  const logout = async () => {
    try {
      await logoutAuthSession();
    } catch {
      // Proceed with local cleanup even if network call fails
    } finally {
      clearSession();
    }
  };

  const demoEnabled = !isProdEnv(appEnv) && demoAccounts.length > 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authLoading,
        appEnv,
        demoEnabled,
        isAuthenticated: Boolean(user && token),
        demoAccounts: demoEnabled ? demoAccounts : [],
        login,
        logout,
        quickSwitchAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
