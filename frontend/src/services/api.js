import axios from "axios";

const ACCESS_TOKEN_KEY = "syntaxtime_access_token";
const REFRESH_TOKEN_KEY = "syntaxtime_refresh_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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

// When the access token has expired the API answers 401. Try the refresh token
// once and replay the original request, so the user never sees the expiry.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isExpired = error.response?.status === 401;

    if (isExpired && originalRequest && !originalRequest.hasBeenRetried) {
      originalRequest.hasBeenRetried = true;

      const newAccessToken = await requestNewAccessToken();
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }

      clearTokens();
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
