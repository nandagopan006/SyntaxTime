import { LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { navigationItems } from "./navigationItems";

/** Returns the sidebar label for the page currently open. */
function getPageTitle(pathname) {
  const currentItem = navigationItems.find((item) => item.path === pathname);
  return currentItem ? currentItem.label : "SyntaxTime";
}

function TopBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /** Clears the session and returns the user to the login page. */
  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="h-16 shrink-0 border-b border-rule bg-surface flex items-center justify-between px-6">
      <h1 className="font-display text-xl text-ink">
        {getPageTitle(location.pathname)}
      </h1>

      <div className="flex items-center gap-4">
        <span className="text-sm text-ink-muted">{user.username}</span>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded border border-rule px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <LogOut size={16} aria-hidden="true" />
          Log out
        </button>
      </div>
    </header>
  );
}

export default TopBar;
