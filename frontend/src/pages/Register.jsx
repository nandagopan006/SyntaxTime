import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
      navigate("/app");
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, "Could not create the account. Please try again.")
      );
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
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">Start using SyntaxTime.</p>

        <label className="block text-sm font-medium text-slate-700" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2"
        />

        <label className="block text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
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
          autoComplete="new-password"
          className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2"
        />

        <label
          className="block text-sm font-medium text-slate-700"
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
          className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2"
        />

        {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
