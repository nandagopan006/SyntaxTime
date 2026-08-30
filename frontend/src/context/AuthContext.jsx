import { createContext, useContext, useEffect, useState } from "react";

import {
  clearTokens,
  getAccessToken,
  setSessionExpiredHandler,
} from "../services/api";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

/**
 * Holds the signed-in user for the whole application.
 *
 * This is the single source of truth for who is signed in. Redux owns the
 * timer and shared UI flags; authentication stays here, so there is only ever
 * one answer to "is somebody signed in".
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On startup a token may still be in localStorage from a previous visit.
  // Ask the API who it belongs to instead of trusting it blindly.
  useEffect(() => {
    async function restoreSession() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // If a token expires mid-session and cannot be refreshed, the API layer says
  // so here. Dropping the user sends the application back to the login screen
  // instead of leaving a dashboard that silently fails every request.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));

    return () => setSessionExpiredHandler(null);
  }, []);

  async function login(credentials) {
    const signedInUser = await authService.login(credentials);
    setUser(signedInUser);
    return signedInUser;
  }

  async function register(details) {
    return authService.register(details);
  }

  function logout() {
    authService.logout();
    setUser(null);
  }

  const value = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
