import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/** Renders its children only for a signed-in user, otherwise sends them to login. */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Without this the page would flash the login screen on every reload,
  // while /api/auth/me/ is still being checked.
  if (isLoading) {
    return <p className="p-8 text-slate-600">Loading...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
