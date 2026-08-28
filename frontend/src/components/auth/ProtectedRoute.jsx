import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/** Renders its children only for a signed-in user, otherwise sends them to login. */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Without this the login screen would flash on every reload, while
  // /api/auth/me/ is still confirming the stored token.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
