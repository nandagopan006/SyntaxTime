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

  The same rule is why a session is only restored on the day it began.
  Today's total on Home is the saved total plus whatever the active session
  has earned, so a session from yesterday would come back and add yesterday's
  minutes to today - and then move to yesterday the moment it was saved,
  because the record is filed by when the session began.

  The day is taken from when the session started rather than when the snapshot
  was written. Those differ for a session running through midnight, which would
  otherwise be written with today's date at one minute past and restore
  yesterday's minutes into today.
*/

import { toApiDate } from "../../utils/formatDate";

const STORAGE_KEY = "syntaxtime_active_timer";

// How often the snapshot is refreshed while a session runs. The countdown
// ticks four times a second, which is far more often than is worth writing to
// disk; five seconds is the most that can be lost to a crash.
export const SNAPSHOT_INTERVAL_MS = 5000;

/**
 * The local day a snapshot belongs to.
 *
 * A focus session belongs to the day it began, which is how the record is
 * filed once it is saved. A break has no start time and never becomes a
 * record, so it belongs to the day it was written.
 */
function dayOf(snapshot) {
  return snapshot.startedAt
    ? toApiDate(new Date(snapshot.startedAt))
    : snapshot.savedOn;
}

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
        // Interruptions belong to the session, so a session that comes back
        // comes back knowing how often it was already interrupted.
        pauseCount: timer.pauseCount ?? 0,
        // The local day this was written on, so a session cannot be restored
        // into a day it was not studied in.
        savedOn: toApiDate(new Date()),
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
 * Anything malformed, from an older version, from a previous day, or without
 * real focused time is treated as nothing to restore. A snapshot is a
 * convenience; it is never allowed to break startup or to produce a session
 * that could not have happened.
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
      snapshot.remainingSeconds > 0 &&
      // Restoring across midnight would count yesterday's minutes toward
      // today, and then lose them again on saving.
      Boolean(snapshot.savedOn) &&
      dayOf(snapshot) === toApiDate(new Date());

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
