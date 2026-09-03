import { useCallback, useEffect } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import {
  TIMER_COMMANDS,
  broadcastTimerState,
  listenForTimerCommands,
  listenForTimerStateRequests,
} from "../desktop/desktopEvents";
import { isDesktopApp } from "../desktop/isDesktop";
import { selectLiveTodayFocusSeconds } from "../features/statistics/statisticsSlice";
import {
  finishTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
} from "../features/timer/timerSlice";
import { getTimerPhase, getTimerStatus } from "../features/timer/timerStatus";

// The clock face changes once a second, so it is sent once a second. Faster
// would be hundreds of events nobody can see.
const BROADCAST_INTERVAL_MS = 1000;

/**
 * Connects the main window's timer to the native focus window.
 *
 * Mounted once, beside useTimer, so the main window is the only place a
 * session is counted. This sends what the focus window should draw and turns
 * its button presses into the same Redux actions the main window's own
 * buttons dispatch - there is no second pause, reset or finish anywhere.
 *
 * Does nothing at all in a browser.
 */
export function useFocusWindowBridge() {
  const dispatch = useDispatch();
  // The store is read at broadcast time rather than subscribed to, so a
  // once-a-second send does not re-render the whole main window every second.
  const store = useStore();
  const isRunning = useSelector((state) => state.timer.isRunning);
  const isPaused = useSelector((state) => state.timer.isPaused);
  const isCompleted = useSelector((state) => state.timer.isCompleted);

  // The store object never changes, so this is built once and the interval
  // below is never torn down just because the component re-rendered.
  const buildState = useCallback(() => {
    const state = store.getState();
    const timer = state.timer;

    return {
      remainingSeconds: timer.remainingSeconds,
      durationSeconds: timer.durationSeconds,
      elapsedFocusSeconds: timer.elapsedFocusSeconds,
      mode: timer.mode,
      isRunning: timer.isRunning,
      isPaused: timer.isPaused,
      isCompleted: timer.isCompleted,
      subject: timer.subject,
      topic: timer.topic,
      // Worked out here so the focus window never adds anything up itself.
      status: getTimerStatus(timer),
      phase: getTimerPhase(timer),
      todayFocusSeconds: selectLiveTodayFocusSeconds(state),
    };
  }, [store]);

  useEffect(() => {
    if (!isDesktopApp()) {
      return undefined;
    }

    let isCurrent = true;
    const send = () => broadcastTimerState(buildState());

    // Sent immediately on any change of state, so pausing looks instant
    // rather than waiting for the next tick.
    send();

    // And on a tick while the session is live, which is what moves the
    // countdown. A still timer has nothing to say.
    const intervalId = isRunning
      ? setInterval(send, BROADCAST_INTERVAL_MS)
      : null;

    // A focus window that has just opened asks for the state rather than
    // waiting up to a second for the next broadcast.
    let stopListening = () => {};
    listenForTimerStateRequests(() => send()).then((unlisten) => {
      if (isCurrent) {
        stopListening = unlisten;
      } else {
        unlisten();
      }
    });

    return () => {
      isCurrent = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      stopListening();
    };
  }, [isRunning, isPaused, isCompleted, buildState]);

  useEffect(() => {
    if (!isDesktopApp()) {
      return undefined;
    }

    let isCurrent = true;
    let stopListening = () => {};

    // The same four actions the main window's own controls dispatch. The
    // focus window sends an intention; what it means is decided here.
    listenForTimerCommands((command) => {
      if (command === TIMER_COMMANDS.start) {
        // Started here rather than there, like every other command: the main
        // window owns the session, so this is the same action its own Start
        // button dispatches. The length is whichever one is already selected.
        const timer = store.getState().timer;
        if (!timer.isRunning && !timer.isPaused && timer.durationSeconds > 0) {
          dispatch(
            startTimer({
              startedAt: new Date().toISOString(),
              now: Date.now(),
            })
          );
        }
      } else if (command === TIMER_COMMANDS.pause) {
        dispatch(pauseTimer(Date.now()));
      } else if (command === TIMER_COMMANDS.resume) {
        dispatch(resumeTimer(Date.now()));
      } else if (command === TIMER_COMMANDS.reset) {
        dispatch(resetTimer());
      } else if (command === TIMER_COMMANDS.finish) {
        dispatch(finishTimer(Date.now()));
      }
    }).then((unlisten) => {
      if (isCurrent) {
        stopListening = unlisten;
      } else {
        unlisten();
      }
    });

    return () => {
      isCurrent = false;
      stopListening();
    };
  }, [dispatch, store]);
}
