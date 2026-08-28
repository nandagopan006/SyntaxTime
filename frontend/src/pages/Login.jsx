import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
      navigate("/app");
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
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-8"
      >
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">Continue to SyntaxTime.</p>

        <label className="block text-sm font-medium text-slate-700" htmlFor="username">
          Username or email
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2"
        />

        <label className="block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2"
        />

        {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-6 text-sm text-slate-600">
          No account yet?{" "}
          <Link to="/register" className="text-slate-900 underline">
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
