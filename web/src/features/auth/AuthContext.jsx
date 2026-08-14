// Authentication state for the whole app.
//
// The token lives in localStorage so a refresh does not log the user out. On boot
// we re-fetch the profile rather than trusting a cached user object: roles and
// verification status change server-side, and a stale copy silently grants or
// denies the wrong screens.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { authAPI, clearToken, getToken, setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Distinct from "no user": until the profile fetch settles we cannot tell a
  // logged-out visitor from a logged-in one, and routing on that guess would
  // flash the login page at authenticated users on every refresh.
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        setInitialising(false);
        return;
      }
      try {
        const { data } = await authAPI.getMe();
        if (!cancelled) setUser(data.user || data.data || null);
      } catch {
        // Token rejected or the server is unreachable. Either way we cannot
        // treat this session as authenticated.
        clearToken();
      } finally {
        if (!cancelled) setInitialising(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authAPI.login(credentials);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      initialising,
      isAuthenticated: Boolean(user),
      // The backend stores userType and exposes `role` as an alias, but not on
      // every response. Check both rather than depending on which one is present.
      userType: user?.userType || user?.role || null,
      isAdmin: user?.userType === "admin" || user?.role === "admin",
      canDonate: ["donor", "both", "admin"].includes(user?.userType || user?.role),
      canReceive: ["recipient", "both", "admin"].includes(user?.userType || user?.role),
      login,
      register,
      logout,
    }),
    [user, initialising, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
