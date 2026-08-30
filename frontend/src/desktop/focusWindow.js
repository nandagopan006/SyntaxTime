import { isDesktopApp } from "./isDesktop";

/*
  Opening and placing the native focus window.

  The window itself is declared in tauri.conf.json rather than created here.
  That means there can only ever be one of it - no focus-2, no focus-3 - and
  the frontend never needs permission to create windows at all. Everything
  below only shows, hides and positions the one that already exists.
*/

export const FOCUS_WINDOW_LABEL = "focus";

// Kept clear of the Windows taskbar and the screen edge, so the window lands
// somewhere usable rather than half under the clock.
const SCREEN_MARGIN = 24;
const TASKBAR_ALLOWANCE = 56;

/** Returns the Tauri window object for the focus window, or null in a browser. */
async function getFocusWindow() {
  if (!isDesktopApp()) {
    return null;
  }

  const { Window } = await import("@tauri-apps/api/window");
  return await Window.getByLabel(FOCUS_WINDOW_LABEL);
}

/**
 * Puts the window in the lower right of the monitor the user is on.
 *
 * Worked out from the monitor rather than hard-coded, so a 1366x768 laptop and
 * a 4K screen both get a window that is fully on screen and clear of the
 * taskbar.
 */
async function positionBottomRight(focusWindow) {
  const { currentMonitor, primaryMonitor, PhysicalPosition } = await import(
    "@tauri-apps/api/window"
  );

  const monitor = (await currentMonitor()) ?? (await primaryMonitor());
  if (!monitor) {
    return;
  }

  const windowSize = await focusWindow.outerSize();
  const scale = monitor.scaleFactor ?? 1;

  const x =
    monitor.position.x +
    monitor.size.width -
    windowSize.width -
    Math.round(SCREEN_MARGIN * scale);
  const y =
    monitor.position.y +
    monitor.size.height -
    windowSize.height -
    Math.round(TASKBAR_ALLOWANCE * scale);

  // Never off the top or left edge, however small the screen is.
  await focusWindow.setPosition(
    new PhysicalPosition(
      Math.max(monitor.position.x, x),
      Math.max(monitor.position.y, y)
    )
  );
}

/**
 * Opens the native always-on-top SyntaxTime focus window.
 *
 * Safe to call when it is already open: the window is shown and focused
 * rather than duplicated. Returns false in a browser, where the caller falls
 * back to the in-page popup.
 */
export async function openFocusWindow() {
  const focusWindow = await getFocusWindow();
  if (!focusWindow) {
    return false;
  }

  const wasVisible = await focusWindow.isVisible();

  // Re-asserted on every open. Windows can drop the flag when another
  // application takes over the screen, and the whole point of this window is
  // that it stays visible over the editor.
  await focusWindow.setAlwaysOnTop(true);

  // Only placed when it was not already on screen, so reopening never yanks a
  // window the user has deliberately moved.
  if (!wasVisible) {
    await positionBottomRight(focusWindow);
  }

  await focusWindow.show();
  // Focused only here, when the user asked for it. Focusing on every state
  // update would steal the caret out of whatever they are typing in.
  await focusWindow.setFocus();

  return true;
}

/**
 * Hides the focus window from the main window.
 *
 * The session it was showing carries on running: this closes a view, never a
 * timer.
 */
export async function closeFocusWindow() {
  const focusWindow = await getFocusWindow();
  if (!focusWindow) {
    return false;
  }

  await focusWindow.hide();
  return true;
}

/**
 * Hides the window this code is running in.
 *
 * Used by the focus window's own close button. Addressing the current window
 * rather than looking one up by label means the button cannot miss, and it is
 * the same thing the operating system's close button ends up doing.
 */
export async function hideCurrentWindow() {
  if (!isDesktopApp()) {
    return false;
  }

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().hide();
  return true;
}
