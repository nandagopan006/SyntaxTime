import { isDesktopApp } from "./isDesktop";

/*
  Telling the user a session has ended.

  This exists because of where SyntaxTime is used. Somebody who starts a
  ninety minute session goes back to their editor, and a countdown reaching
  zero in a hidden window tells nobody anything. The one person who does not
  need a notification is the one already looking at the application.

  On the desktop these are real Windows notifications. In a browser they are
  the ordinary web ones, which need a tab that is still open - honest, but
  weaker, and nothing here pretends otherwise.
*/

/** Whether the user has already been asked, so they are asked at most once. */
let hasAskedForPermission = false;

/**
 * Asks for permission to send notifications, once.
 *
 * Called when a session starts rather than when the application opens: being
 * asked for permission by something you have not used yet is the surest way
 * to have it refused.
 */
export async function requestNotificationPermission() {
  if (hasAskedForPermission) {
    return;
  }
  hasAskedForPermission = true;

  try {
    if (isDesktopApp()) {
      const { isPermissionGranted, requestPermission } = await import(
        "@tauri-apps/plugin-notification"
      );

      if (!(await isPermissionGranted())) {
        await requestPermission();
      }
      return;
    }

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {
    // A refused or unavailable permission costs a notification and nothing
    // else. The timer, the session and the record are all unaffected.
  }
}

/**
 * Shows a notification, unless the user is already looking at SyntaxTime.
 *
 * Somebody watching the countdown does not need to be told it reached zero,
 * and a notification over the window they are reading is just noise.
 */
export async function notify(title, body) {
  try {
    if (isDesktopApp()) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      if (await getCurrentWindow().isFocused()) {
        return;
      }

      const { isPermissionGranted, sendNotification } = await import(
        "@tauri-apps/plugin-notification"
      );

      if (await isPermissionGranted()) {
        sendNotification({ title, body });
      }
      return;
    }

    if (document.visibilityState === "visible") {
      return;
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // Never let a missing notification break the thing it was reporting on.
  }
}
