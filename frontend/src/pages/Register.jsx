import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";

function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    // Quick checks so an obviously incomplete form never reaches the server.
    // Django still validates everything again, and it has the final say.
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill in every field.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
      });
      // Sign the new user straight in, so they do not retype what they just entered.
      await login({ username: username.trim(), password });
      navigate("/");
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, "Could not create the account. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-parchment p-4">
      <form
        onSubmit={handleSubmit}
        className="surface-card w-full max-w-sm p-8 shadow-panel"
      >
        <p className="section-eyebrow">Syntax<span className="text-ink-faint">Time</span></p>
        <h1 className="mt-2 text-3xl text-ink">Create account</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">Start using SyntaxTime.</p>

        <label className="block text-sm font-medium text-ink" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="field-control mt-1.5 mb-4"
        />

        <label className="block text-sm font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="field-control mt-1.5 mb-4"
        />

        <label className="block text-sm font-medium text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className="field-control mt-1.5 mb-4"
        />

        <label
          className="block text-sm font-medium text-ink"
          htmlFor="password-confirm"
        >
          Confirm password
        </label>
        <input
          id="password-confirm"
          type="password"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          autoComplete="new-password"
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

        <Button type="submit" variant="primary" fullWidth isBusy={isSubmitting} busyLabel="Creating account...">
          Create account
        </Button>

        <p className="mt-6 text-sm text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-brass underline underline-offset-2 hover:text-brass-deep">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
