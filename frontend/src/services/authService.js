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

/**
 * Confirms the code that was emailed, which is what creates the account.
 *
 * No tokens come back from this: the account now exists, so the ordinary
 * login flow takes over and there is still only one way in.
 */
export async function verifyEmail({ email, otp }) {
  const response = await api.post("/auth/verify-email/", { email, otp });
  return response.data;
}

/** Asks for a fresh code. The server refuses if the last one is still recent. */
export async function resendOtp(email) {
  const response = await api.post("/auth/resend-otp/", { email });
  return response.data;
}

// The address being verified has to survive a page refresh, or reloading the
// verify screen would strand somebody with a code and nowhere to type it.
// Only the address is kept. The password and the code are never written down
// anywhere in the browser.
const PENDING_EMAIL_KEY = "syntaxtime_pending_email";

export function savePendingEmail(email) {
  sessionStorage.setItem(PENDING_EMAIL_KEY, email);
}

export function getPendingEmail() {
  return sessionStorage.getItem(PENDING_EMAIL_KEY);
}

export function clearPendingEmail() {
  sessionStorage.removeItem(PENDING_EMAIL_KEY);
}

/**
 * Asks for a password reset email to be sent to this address.
 *
 * The reply is the same whether or not an account exists, so nothing here can
 * be used to find out who is registered.
 */
export async function requestPasswordReset(email) {
  const response = await api.post("/auth/forgot-password/", { email });
  return response.data;
}

/**
 * Sets a new password using the token from a reset link.
 *
 * The token comes straight from the URL and is never stored. Django decides
 * whether it is still good; this only carries it.
 */
export async function resetPassword({ uid, token, newPassword, confirmPassword }) {
  const response = await api.post("/auth/reset-password/", {
    uid,
    token,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
}
