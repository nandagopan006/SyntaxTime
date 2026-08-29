import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import { getErrorMessage } from "../services/api";
import {
  clearPendingEmail,
  getPendingEmail,
  resendOtp,
  verifyEmail,
} from "../services/authService";

const OTP_LENGTH = 6;

// The server enforces its own cooldown and has the final say. This countdown
// only stops the button being pressed into a refusal.
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Hides most of the address while still letting someone recognise it.
 * `nandhu@gmail.com` becomes `n***@gmail.com`.
 */
function maskEmail(email) {
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1) {
    return email;
  }
  return `${email.slice(0, 1)}***${email.slice(atIndex)}`;
}

/**
 * Where a registration waits for the code that was emailed to it.
 *
 * Nothing sensitive lives on this screen. The password was sent once during
 * registration and is not held here, and the code itself is only ever typed
 * in and posted, never stored.
 */
function VerifyEmail() {
  const navigate = useNavigate();

  // Read once on the first render. A refresh finds the address again in
  // session storage, so reloading this page is not a dead end.
  const [email] = useState(getPendingEmail);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(
    RESEND_COOLDOWN_SECONDS
  );

  // Arriving here directly, with no registration in progress, there is nothing
  // to verify and no address to verify it against.
  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (secondsUntilResend === 0) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setSecondsUntilResend((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timerId);
  }, [secondsUntilResend]);

  if (!email) {
    return null;
  }

  function handleOtpChange(event) {
    // Digits only, so a pasted code with spaces or a stray letter still works.
    const digits = event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      await verifyEmail({ email, otp });
      clearPendingEmail();
      // The account exists now, so signing in is an ordinary sign-in.
      navigate("/login", {
        replace: true,
        state: { notice: "Email verified. You can sign in now." },
      });
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, "Could not verify the code. Please try again.")
      );
      setOtp("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setNotice("");
    setIsResending(true);

    try {
      await resendOtp(email);
      setNotice("A new code is on its way.");
      setOtp("");
      setSecondsUntilResend(RESEND_COOLDOWN_SECONDS);
    } catch (resendError) {
      setError(
        getErrorMessage(resendError, "Could not send a new code. Please try again.")
      );
      // The server refused, so the button waits again rather than inviting
      // another refusal straight away.
      setSecondsUntilResend(RESEND_COOLDOWN_SECONDS);
    } finally {
      setIsResending(false);
    }
  }

  function handleUseDifferentEmail() {
    clearPendingEmail();
    navigate("/register", { replace: true });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-parchment p-4">
      <form
        onSubmit={handleSubmit}
        className="surface-card w-full max-w-sm p-8 shadow-panel"
      >
        <p className="section-eyebrow">Syntax<span className="text-ink-faint">Time</span></p>
        <h1 className="mt-2 text-3xl text-ink">Verify your email</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">
          We sent a {OTP_LENGTH}-digit code to{" "}
          <span className="text-ink">{maskEmail(email)}</span>.
        </p>

        <label className="block text-sm font-medium text-ink" htmlFor="otp">
          Verification code
        </label>
        <input
          id="otp"
          type="text"
          value={otp}
          onChange={handleOtpChange}
          // Tells phones to offer a number pad and browsers to offer the code
          // straight from the email.
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          autoFocus
          aria-describedby="otp-hint"
          className="field-control mt-1.5 text-center text-2xl tracking-[0.5em]"
        />
        <p id="otp-hint" className="mt-2 mb-4 text-xs text-ink-faint">
          The code expires in 10 minutes.
        </p>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-burgundy/25 bg-burgundy/5 px-3 py-2 text-sm text-burgundy"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mb-4 rounded-md border border-rule bg-surface-sunken px-3 py-2 text-sm text-ink-muted"
          >
            {notice}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isBusy={isSubmitting}
          busyLabel="Verifying..."
        >
          Verify Email
        </Button>

        <div className="mt-6 flex items-center justify-between text-sm">
          {secondsUntilResend > 0 ? (
            <span className="text-ink-faint">
              Resend in {secondsUntilResend}s
            </span>
          ) : (
            <Button
              variant="quiet"
              size="sm"
              className="-ml-3"
              onClick={handleResend}
              isBusy={isResending}
              busyLabel="Sending..."
            >
              Resend code
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
      </form>
    </main>
  );
}

export default VerifyEmail;
