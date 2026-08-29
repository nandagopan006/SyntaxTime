import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import PasswordInput from "../components/auth/PasswordInput";
import Button from "../components/ui/Button";
import { getErrorMessage } from "../services/api";
import { resetPassword } from "../services/authService";

/**
 * The screen a reset link opens.
 *
 * The link itself is the authorisation, so this page is open to anyone holding
 * one. Whether it is still good is Django's decision, not this page's: the
 * token is carried straight from the URL to the API and never stored.
 */
function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  // Set when the server says the link itself is no good, which is a different
  // problem from a password the user can simply retype.
  const [isLinkDead, setIsLinkDead] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasReset, setHasReset] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError("Enter and confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsResetting(true);

    try {
      await resetPassword({ uid, token, newPassword, confirmPassword });
      setHasReset(true);
    } catch (submitError) {
      const responseData = submitError.response?.data;

      if (responseData?.token) {
        setIsLinkDead(true);
      } else {
        setError(
          getErrorMessage(submitError, "Could not reset the password. Please try again.")
        );
      }
    } finally {
      setIsResetting(false);
    }
  }

  if (isLinkDead) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-parchment p-4">
        <div className="surface-card w-full max-w-sm p-8 shadow-panel">
          <p className="section-eyebrow">Syntax<span className="text-ink-faint">Time</span></p>
          <h1 className="mt-2 text-3xl text-ink">Link no longer works</h1>
          <p className="mt-3 mb-6 text-sm text-ink-muted">
            This password reset link is invalid or has expired. Reset links last
            30 minutes and can only be used once.
          </p>

          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate("/forgot-password", { replace: true })}
          >
            Request a new link
          </Button>

          <p className="mt-6 text-sm text-ink-muted">
            <Link
              to="/login"
              className="text-brass underline underline-offset-2 hover:text-brass-deep"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (hasReset) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-parchment p-4">
        <div className="surface-card w-full max-w-sm p-8 shadow-panel">
          <p className="section-eyebrow">Syntax<span className="text-ink-faint">Time</span></p>
          <h1 className="mt-2 text-3xl text-ink">Password updated</h1>
          <p className="mt-3 mb-6 text-sm text-ink-muted">
            You can now sign in with your new password.
          </p>

          {/* replace, so the back button cannot return to a spent reset link. */}
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to Login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-parchment p-4">
      <form
        onSubmit={handleSubmit}
        className="surface-card w-full max-w-sm p-8 shadow-panel"
      >
        <p className="section-eyebrow">Syntax<span className="text-ink-faint">Time</span></p>
        <h1 className="mt-2 text-3xl text-ink">Reset your password</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">
          Create a new password for your SyntaxTime account.
        </p>

        <PasswordInput
          label="New password"
          id="new-password"
          name="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          disabled={isResetting}
          className="mb-4"
        />

        <PasswordInput
          label="Confirm password"
          id="confirm-password"
          name="confirm-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          disabled={isResetting}
          className="mb-4"
        />

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-burgundy/25 bg-burgundy/5 px-3 py-2 text-sm text-burgundy"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isBusy={isResetting}
          busyLabel="Updating password..."
        >
          Reset Password
        </Button>

        <p className="mt-6 text-sm text-ink-muted">
          <Link
            to="/login"
            className="text-brass underline underline-offset-2 hover:text-brass-deep"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default ResetPassword;
