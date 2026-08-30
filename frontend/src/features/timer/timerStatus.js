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

/**
 * Returns the timer's phase as a key, for anything that has to look different
 * per state rather than read differently.
 *
 * Separate from getTimerStatus because that returns words for a person. A
 * colour or an animation cannot be chosen from "Session complete" without
 * matching on prose, which breaks the moment the wording is improved.
 */
export function getTimerPhase(timer) {
  // A break is its own look throughout, including when it has run out: there
  // is nothing to celebrate at the end of a rest.
  if (timer.mode === "break") {
    return "break";
  }

  if (timer.isCompleted) {
    return "complete";
  }
  if (timer.isPaused) {
    return "paused";
  }
  if (timer.isRunning) {
    return "running";
  }

  return "ready";
}

/**
 * Returns how many seconds of the current phase have been spent, for the
 * clock's progress ring.
 *
 * Not the same question as "how much study time has this earned". A break
 * never adds to elapsedFocusSeconds - that guard is what keeps break minutes
 * out of every study total - so its progress is read back from the countdown
 * instead. The ring then means the same thing in both modes: how far through
 * this phase you are.
 */
export function getElapsedSeconds(timer) {
  if (timer.mode === "break") {
    return Math.max(timer.durationSeconds - timer.remainingSeconds, 0);
  }

  return timer.elapsedFocusSeconds;
}
