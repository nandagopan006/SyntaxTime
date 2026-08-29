/*
  The one word describing what the timer is doing.

  Home, the compact popup and Focus Mode each used to work this out for
  themselves, and they had drifted: the same running session read "Focus" on
  Home and "Focusing" in Focus Mode. It is one piece of derived state, so it
  is derived in one place.
*/

/**
 * Returns the status word for the timer, in the user's language.
 *
 * Always written out rather than shown only as a colour, so the state can be
 * read without seeing the ring.
 */
export function getTimerStatus(timer) {
  if (timer.mode === "break") {
    return timer.isCompleted ? "Break over" : "Break";
  }

  if (timer.isCompleted) {
    return "Session complete";
  }
  if (timer.isPaused) {
    return "Paused";
  }
  if (timer.isRunning) {
    return "Focus";
  }

  return "Ready";
}
