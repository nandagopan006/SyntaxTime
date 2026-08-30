/*
  Whether SyntaxTime is running inside the Tauri desktop shell or an ordinary
  browser tab.

  Both are supported on purpose: development happens in a browser, and the
  packaged Windows application is the same React build inside Tauri. Every
  desktop-only feature checks here first and falls back to something honest
  rather than pretending a web page can float above VS Code.
*/

/**
 * True when the Tauri runtime is available.
 *
 * Tauri 2 injects `__TAURI_INTERNALS__` into the page, so the check needs no
 * import and cannot fail in a plain browser.
 */
export function isDesktopApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
