import api, { clearTokens, saveTokens } from "./api";

/** Creates a new SyntaxTime account. */
export async function register(details) {
  const response = await api.post("/auth/register/", details);
  return response.data;
}

/** Signs in, stores the tokens and returns the authenticated user. */
export async function login(credentials) {
  const response = await api.post("/auth/login/", credentials);
  saveTokens(response.data);
  return response.data.user;
}

/** Returns the signed-in user. Throws if the stored token is no longer valid. */
export async function getCurrentUser() {
  const response = await api.get("/auth/me/");
  return response.data;
}

/** Ends the session by removing the stored tokens. */
export function logout() {
  clearTokens();
}
