import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import FocusWindow from "./pages/FocusWindow.jsx";
import ErrorBoundary from "./components/layout/ErrorBoundary.jsx";
import "./index.css";

/*
  The entry point for the native focus window.

  Its own HTML page rather than a route inside the main application, for two
  reasons. Tauri serves the packaged build over a file protocol with no
  single-page fallback, so a path like /focus-window would simply not exist
  once the application is installed. And this window genuinely needs none of
  what the main entry sets up: no router, no authentication, no Redux store.
  It is handed a timer state and draws it.
*/
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <FocusWindow />
    </ErrorBoundary>
  </StrictMode>
);
