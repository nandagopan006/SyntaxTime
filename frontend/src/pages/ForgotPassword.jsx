import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Button from "../components/ui/Button";
import { getErrorMessage } from "../services/api";
import { requestPasswordReset } from "../services/authService";

// The server keeps its own minute between sends. This countdown only stops the
// button being pressed into a request that will quietly do nothing.
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Where somebody who cannot sign in asks for a reset link.
 *
 * The screen never says whether the address has an account. Telling a stranger
 * which addresses are registered here would be a favour to the wrong person.
 */
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [hasSent, setHasSent] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  useEffect(() => {
    if (secondsUntilResend === 0) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setSecondsUntilResend((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timerId);
  }, [secondsUntilResend]);

  async function sendResetLink() {
    if (!email.trim()) {
      setError("Enter the email address for your account.");
      return;
    }

    setError("");
    setIsSending(true);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setHasSent(true);
      setSecondsUntilResend(RESEND_COOLDOWN_SECONDS);
    } catch (submitError) {
      // The address stays in the field, so a failure does not cost the typing.
      setError(
        getErrorMessage(submitError, "Could not send the reset link. Please try again.")
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await sendResetLink();
  }

  function handleUseDifferentEmail() {
    setHasSent(false);
    setError("");
    setSecondsUntilResend(0);
    setEmail("");
  }

  if (hasSent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-parchment p-4">
        <div className="surface-card w-full max-w-sm p-8 shadow-panel">
          <p className="section-eyebrow">Syntax<span className="text-ink-faint">Time</span></p>
          <h1 className="mt-2 text-3xl text-ink">Check your email</h1>
          <p className="mt-3 text-sm text-ink-muted">
            If an account exists for that email, SyntaxTime has sent
            instructions for resetting your password.
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            The link expires in 30 minutes.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-burgundy/25 bg-burgundy/5 px-3 py-2 text-sm text-burgundy"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between text-sm">
            {secondsUntilResend > 0 ? (
              <span className="text-ink-faint">Resend in {secondsUntilResend}s</span>
            ) : (
              <Button
                variant="quiet"
                size="sm"
                className="-ml-3"
                onClick={sendResetLink}
                isBusy={isSending}
                busyLabel="Sending..."
              >
                Resend reset link
              </Button>
            )}

            <button
              type="button"
              onClick={handleUseDifferentEmail}
              className="text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Use a different email
            </button>
          </div>

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

  return (
    <main className="min-h-screen flex items-center justify-center bg-parchment p-4">
      <form
        onSubmit={handleSubmit}
        className="surface-card w-full max-w-sm p-8 shadow-panel"
      >
        <p className="section-eyebrow">Syntax<span className="text-ink-faint">Time</span></p>
        <h1 className="mt-2 text-3xl text-ink">Forgot password</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">
          Enter the email associated with your SyntaxTime account.
        </p>

        <label className="block text-sm font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          autoFocus
          className="field-control mt-1.5 mb-4"
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
          isBusy={isSending}
          busyLabel="Sending reset link..."
        >
          Send Reset Link
        </Button>

        <p className="mt-6 text-sm text-ink-muted">
          Remembered it?{" "}
          <Link
            to="/login"
            className="text-brass underline underline-offset-2 hover:text-brass-deep"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default ForgotPassword;
