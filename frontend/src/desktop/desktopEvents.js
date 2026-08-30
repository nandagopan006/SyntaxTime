import { isDesktopApp } from "./isDesktop";

/*
  How the two desktop windows stay in step.

  Tauri gives each window its own webview, which means its own React tree and
  its own Redux store. Two stores would be two timers, so only one of them is
  allowed to count: the main window owns the session, and the focus window is
  a display with buttons on it.

      main window                     focus window
      timer runs here   -- state -->  draws it
      dispatches        <- command --  Pause / Resume / Reset / Finish

  Nothing here interprets the timer. The state travels as-is and the commands
  travel back as-is, so there is no second opinion about how long somebody has
  been studying.
*/

// The main window's timer, on its way out. Sent about once a second, which is
// as often as a clock face can change.
export const TIMER_STATE_EVENT = "syntaxtime://timer-state";

// A button pressed in the focus window, on its way to the timer.
export const TIMER_COMMAND_EVENT = "syntaxtime://timer-command";

// The focus window asking for the current state, so reopening never shows a
// stale countdown while it waits for the next broadcast.
export const TIMER_STATE_REQUEST_EVENT = "syntaxtime://timer-state-request";

export const TIMER_COMMANDS = {
  pause: "pause",
  resume: "resume",
  reset: "reset",
  finish: "finish",
};

/**
 * Sends the current timer state to the focus window.
 *
 * A plain object, not the Redux store: the focus window is told what to draw
 * and is never given anything to decide.
 */
export async function broadcastTimerState(state) {
  if (!isDesktopApp()) {
    return;
  }

  const { emit } = await import("@tauri-apps/api/event");
  await emit(TIMER_STATE_EVENT, state);
}

/**
 * Listens for timer state from the main window.
 *
 * Returns the function that stops listening. Callers must call it when the
 * component goes away, or a hidden window keeps handling events forever.
 */
export async function listenForTimerState(onState) {
  if (!isDesktopApp()) {
    return () => {};
  }

  const { listen } = await import("@tauri-apps/api/event");
  return await listen(TIMER_STATE_EVENT, (event) => onState(event.payload));
}

/** Sends a Pause, Resume, Reset or Finish from the focus window to the timer. */
export async function sendTimerCommand(command) {
  if (!isDesktopApp()) {
    return;
  }

  const { emit } = await import("@tauri-apps/api/event");
  await emit(TIMER_COMMAND_EVENT, { command });
}

/** Listens for commands from the focus window. Returns the unlisten function. */
export async function listenForTimerCommands(onCommand) {
  if (!isDesktopApp()) {
    return () => {};
  }

  const { listen } = await import("@tauri-apps/api/event");
  return await listen(TIMER_COMMAND_EVENT, (event) =>
    onCommand(event.payload?.command)
  );
}

/** Asks the main window to send the current state straight away. */
export async function requestTimerState() {
  if (!isDesktopApp()) {
    return;
  }

  const { emit } = await import("@tauri-apps/api/event");
  await emit(TIMER_STATE_REQUEST_EVENT);
}

/** Listens for a focus window asking for the current state. */
export async function listenForTimerStateRequests(onRequest) {
  if (!isDesktopApp()) {
    return () => {};
  }

  const { listen } = await import("@tauri-apps/api/event");
  return await listen(TIMER_STATE_REQUEST_EVENT, () => onRequest());
}
