import { LogOut, Timer } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { toggleFocusPopup } from "../../features/ui/uiSlice";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import { navigationItems } from "./navigationItems";

/** Returns the sidebar label for the page currently open. */
function getPageTitle(pathname) {
  const currentItem = navigationItems.find((item) => item.path === pathname);
  return currentItem ? currentItem.label : "SyntaxTime";
}

/*
  The application toolbar.

  An application bar, not a website header: it says where you are, offers the
  timer if one is running, and stays out of the way otherwise.
*/
function TopBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const timer = useSelector((state) => state.timer);
  const isFocusPopupOpen = useSelector((state) => state.ui.isFocusPopupOpen);

  // Only offered when there is something to show, so the bar stays quiet
  // when no session is running.
  const hasSession = timer.isRunning || timer.isPaused || timer.isCompleted;
  const isBreak = timer.mode === "break";

  /** Clears the session and returns the user to the login page. */
  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-rule bg-surface px-6">
      <h1 className="truncate text-xl text-ink">{getPageTitle(location.pathname)}</h1>

      <div className="flex min-w-0 items-center gap-3">
        {hasSession && (
          <Button
            size="sm"
            variant={isFocusPopupOpen ? "primary" : "secondary"}
            onClick={() => dispatch(toggleFocusPopup())}
            aria-pressed={isFocusPopupOpen}
          >
            <Timer size={15} aria-hidden="true" />
            {isBreak ? "Break timer" : "Focus timer"}
          </Button>
        )}

        <span
          aria-hidden="true"
          className="hidden h-5 w-px bg-rule sm:block"
        />

        <span className="hidden max-w-[12rem] truncate text-sm text-ink-muted sm:inline">
          {user.username}
        </span>

        <Button size="sm" variant="secondary" onClick={handleLogout}>
          <LogOut size={15} aria-hidden="true" />
          Log out
        </Button>
      </div>
    </header>
  );
}

export default TopBar;
