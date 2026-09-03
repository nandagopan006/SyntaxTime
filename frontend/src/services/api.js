import axios from "axios";

const ACCESS_TOKEN_KEY = "syntaxtime_access_token";
const REFRESH_TOKEN_KEY = "syntaxtime_refresh_token";

// Long enough for a sleeping free-tier host to wake up, short enough that a
// request which is never going to arrive eventually says so. Without any
// timeout a hanging save looks exactly like a button that did nothing, and the
// natural response is to press it again.
const REQUEST_TIMEOUT_MS = 90000;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Stores the pair of tokens returned by the login endpoint. */
export function saveTokens({ access, refresh }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

/** Removes stored tokens, on logout or when a session is no longer valid. */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Called when a session cannot be refreshed and the user has to sign in again.
// This module cannot reach React state directly, so whoever owns that state
// registers what to do here.
let onSessionExpired = null;

/**
 * Registers what should happen when a session can no longer be refreshed.
 *
 * Without this the tokens would be thrown away while the application still
 * believed someone was signed in, leaving them on a dashboard where every
 * request quietly fails.
 */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// Attach the access token to every request, so individual services never
// have to think about authentication headers.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Exchanges the refresh token for a new access token.
 * Uses a plain axios call so it cannot trigger the interceptor below again.
 */
async function requestNewAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/auth/refresh/`,
      { refresh: refreshToken }
    );
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access);
    return response.data.access;
  } catch {
    return null;
  }
}

// Signing in with the wrong password also answers 401. That is a rejected
// attempt, not an expired session, so these endpoints skip the refresh path
// below entirely.
const AUTH_ENDPOINTS = ["/auth/login/", "/auth/register/", "/auth/refresh/"];

function isSignInAttempt(request) {
  return AUTH_ENDPOINTS.some((endpoint) => request.url?.endsWith(endpoint));
}

// When the access token has expired the API answers 401. Try the refresh token
// once and replay the original request, so the user never sees the expiry.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isExpired = error.response?.status === 401;

    if (
      isExpired &&
      originalRequest &&
      !originalRequest.hasBeenRetried &&
      !isSignInAttempt(originalRequest)
    ) {
      originalRequest.hasBeenRetried = true;

      const newAccessToken = await requestNewAccessToken();
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }

      // The session is over and cannot be recovered. Throwing the tokens away
      // is not enough on its own: the application has to be told, or it keeps
      // rendering a signed-in interface that can no longer load anything.
      clearTokens();
      onSessionExpired?.();
    }

    return Promise.reject(error);
  }
);

/**
 * Turns an Axios error into a message that is safe to show the user.
 * DRF replies either with {"detail": "..."} or {"field": ["message"]}.
 */
export function getErrorMessage(error, fallbackMessage) {
  if (!error.response) {
    return "Unable to connect to the server. Please try again.";
  }

  const data = error.response.data;
  if (!data || typeof data !== "object") {
    return fallbackMessage;
  }

  if (data.detail) {
    return data.detail;
  }

  const firstField = Object.keys(data)[0];
  if (firstField) {
    const value = data[firstField];
    return Array.isArray(value) ? value[0] : String(value);
  }

  return fallbackMessage;
}

export default api;
