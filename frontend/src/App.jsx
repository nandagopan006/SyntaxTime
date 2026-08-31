import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import { useAuth } from "./context/useAuth";
import ForgotPassword from "./pages/ForgotPassword";
import Friends from "./pages/Friends";
import History from "./pages/History";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // While a stored token is being checked, nobody knows yet whether this is a
  // signed-in visit. Deciding early would flash the sign-in form at someone who
  // is already signed in. With no stored token there is nothing to check and
  // this passes straight through.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-muted">Loading SyntaxTime...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />
      {/*
        Reached only from the register form. The page sends anyone who arrives
        without a registration in progress back to it.
      */}
      <Route
        path="/verify-email"
        element={isAuthenticated ? <Navigate to="/" replace /> : <VerifyEmail />}
      />

      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
      />
      {/*
        Not redirected away when signed in. The link is the authorisation, and
        somebody already signed in on this machine may still be following one.
      */}
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

      {/*
        A layout route: the four pages below share one AppShell, and the
        authentication check happens once here instead of inside every page.
      */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
