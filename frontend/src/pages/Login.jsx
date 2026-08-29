import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../services/api";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await login({ username: username.trim(), password });
      navigate("/");
    } catch (submitError) {
      // The API deliberately does not say which of the two was wrong.
      const message =
        submitError.response?.status === 401
          ? "Invalid username or password."
          : getErrorMessage(submitError, "Could not sign in. Please try again.");
      setError(message);
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
        <h1 className="mt-2 text-3xl text-ink">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">Continue to SyntaxTime.</p>

        <label className="block text-sm font-medium text-ink" htmlFor="username">
          Username or email
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
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
          autoComplete="current-password"
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

        <Button type="submit" variant="primary" fullWidth isBusy={isSubmitting} busyLabel="Signing in...">
          Sign in
        </Button>

        <p className="mt-6 text-sm text-ink-muted">
          No account yet?{" "}
          <Link to="/register" className="text-brass underline underline-offset-2 hover:text-brass-deep">
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
