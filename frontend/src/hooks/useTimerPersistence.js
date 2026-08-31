import { useEffect, useRef } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import { restoreTimer } from "../features/timer/timerSlice";
import {
  SNAPSHOT_INTERVAL_MS,
  clearTimerSnapshot,
  readTimerSnapshot,
  saveTimerSnapshot,
} from "../features/timer/timerStorage";

/**
 * Keeps the running session across a restart of the application.
 *
 * Mounted once, beside useTimer, in the window that owns the timer. It reads a
 * saved session back on startup and writes the current one while it runs.
 *
 * A restored session comes back paused rather than running: the application
 * cannot tell whether it was closed for two minutes or overnight, and counting
 * that gap as study time would feed invented minutes into every total the
 * application reports.
 */
export function useTimerPersistence() {
  const dispatch = useDispatch();
  // Read at write time rather than subscribed to, so saving every few seconds
  // does not re-render the application.
  const store = useStore();

  const isRunning = useSelector((state) => state.timer.isRunning);
  const isPaused = useSelector((state) => state.timer.isPaused);
  const isCompleted = useSelector((state) => state.timer.isCompleted);

  // Restoring must happen once, before anything is written, or the first
  // write would overwrite the very snapshot being restored.
  const hasRestored = useRef(false);

  useEffect(() => {
    if (hasRestored.current) {
      return;
    }
    hasRestored.current = true;

    const snapshot = readTimerSnapshot();
    if (snapshot) {
      dispatch(restoreTimer(snapshot));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!hasRestored.current) {
      return undefined;
    }

    /**
     * Writes the session if there is one worth coming back to, and forgets it
     * otherwise.
     *
     * One rule rather than a clear call at every ending: reset, finish, save
     * and skipping a break all leave nothing worth restoring, and this notices
     * that without each of them having to remember.
     */
    const persist = () => {
      const timer = store.getState().timer;

      const isWorthKeeping =
        (timer.isRunning || timer.isPaused) &&
        timer.durationSeconds > 0 &&
        timer.remainingSeconds > 0 &&
        timer.remainingSeconds < timer.durationSeconds;

      if (isWorthKeeping) {
        saveTimerSnapshot(timer);
      } else {
        clearTimerSnapshot();
      }
    };

    persist();

    // Refreshed on a slow interval while running, so a crash costs seconds
    // rather than the whole session. A still timer has nothing new to write.
    const intervalId = isRunning
      ? setInterval(persist, SNAPSHOT_INTERVAL_MS)
      : null;

    // A clean quit is the common case, and it is the one chance to record the
    // last few seconds before the window goes.
    window.addEventListener("beforeunload", persist);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener("beforeunload", persist);
    };
  }, [store, isRunning, isPaused, isCompleted]);
}
