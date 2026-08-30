/*
  Remembering a session across a restart.

  SyntaxTime is a desktop application people leave open all day, and until now
  closing it forty minutes into a ninety minute session lost the forty minutes
  entirely. This writes a small snapshot of the running timer and reads it back
  on startup.

  The one decision worth stating: a restored session comes back PAUSED, holding
  exactly the time it had when the snapshot was written. It is never resumed as
  though it had been running the whole time it was closed - somebody who quits
  at six in the evening and opens the application the next morning has not
  studied for fourteen hours, and inventing that time would poison every total,
  streak and leaderboard that reads from it.

  So the rule is: never invent study time. Restoring loses at most a few
  seconds; resuming blindly could gain hours.
*/

const STORAGE_KEY = "syntaxtime_active_timer";

// How often the snapshot is refreshed while a session runs. The countdown
// ticks four times a second, which is far more often than is worth writing to
// disk; five seconds is the most that can be lost to a crash.
export const SNAPSHOT_INTERVAL_MS = 5000;

/**
 * Writes the running session to local storage.
 *
 * Only the fields needed to rebuild it. Nothing derived is stored, so the
 * snapshot cannot disagree with the timer about anything it did not measure.
 */
export function saveTimerSnapshot(timer) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: timer.mode,
        durationSeconds: timer.durationSeconds,
        remainingSeconds: timer.remainingSeconds,
        elapsedFocusSeconds: timer.elapsedFocusSeconds,
        subject: timer.subject,
        topic: timer.topic,
        startedAt: timer.startedAt,
      })
    );
  } catch {
    // A full or unavailable storage costs the restart feature and nothing
    // else. The running session is unaffected.
  }
}

/** Forgets the saved session. Called whenever there is no longer one to restore. */
export function clearTimerSnapshot() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the snapshot is a convenience, not a record.
  }
}

/**
 * Reads back a session saved before the application closed, or null.
 *
 * Anything malformed, from an older version, or without real focused time is
 * treated as nothing to restore. A snapshot is a convenience; it is never
 * allowed to break startup or to produce a session that could not have
 * happened.
 */
export function readTimerSnapshot() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const snapshot = JSON.parse(stored);

    const isUsable =
      snapshot &&
      (snapshot.mode === "focus" || snapshot.mode === "break") &&
      Number.isFinite(snapshot.durationSeconds) &&
      Number.isFinite(snapshot.remainingSeconds) &&
      snapshot.durationSeconds > 0 &&
      // Nothing to come back to: an untouched session is the same as no
      // session, and restoring one would only be confusing.
      snapshot.remainingSeconds < snapshot.durationSeconds &&
      snapshot.remainingSeconds > 0;

    if (!isUsable) {
      clearTimerSnapshot();
      return null;
    }

    return snapshot;
  } catch {
    clearTimerSnapshot();
    return null;
  }
}
