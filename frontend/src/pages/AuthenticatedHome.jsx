import { useAuth } from "../context/AuthContext";

/** Temporary screen that proves authentication works. Phase 5 replaces it with Home. */
function AuthenticatedHome() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">
        SyntaxTime application area
      </h1>
      <p className="mt-2 text-slate-700">Signed in as {user.username}.</p>

      <button
        type="button"
        onClick={logout}
        className="mt-6 rounded border border-slate-300 bg-white px-4 py-2 text-slate-900"
      >
        Log out
      </button>
    </main>
  );
}

export default AuthenticatedHome;
