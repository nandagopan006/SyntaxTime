import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { finishTimer, tickTimer } from "../features/timer/timerSlice";

// Ticking faster than once a second keeps the display from visibly skipping a
// number when an interval fires slightly late.
const TICK_INTERVAL_MS = 250;

/**
 * Drives the countdown for the one active session.
 *
 * Mounted once, at the top of the application, so opening the popup or Focus
 * Mode later cannot start a second countdown. It only handles timer mechanics:
 * saving the session is the caller's job.
 */
export function useTimer() {
  const dispatch = useDispatch();
  const isRunning = useSelector((state) => state.timer.isRunning);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      const now = Date.now();
      dispatch(tickTimer(now));
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isRunning, dispatch]);

  // Reaching zero ends the session through exactly the same action as the
  // Finish button, so there is only one way for a session to complete.
  const remainingSeconds = useSelector((state) => state.timer.remainingSeconds);
  const isCompleted = useSelector((state) => state.timer.isCompleted);

  useEffect(() => {
    if (isRunning && !isCompleted && remainingSeconds <= 0) {
      dispatch(finishTimer(Date.now()));
    }
  }, [isRunning, isCompleted, remainingSeconds, dispatch]);
}
