import { useCallback, useEffect } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import {
  TIMER_COMMANDS,
  broadcastTimerState,
  listenForTimerCommands,
  listenForTimerStateRequests,
} from "../desktop/desktopEvents";
import { showMainWindow } from "../desktop/focusWindow";
import { isDesktopApp } from "../desktop/isDesktop";
import { useFocusCoach } from "../context/useFocusCoach";
import { selectLiveTodayFocusSeconds } from "../features/statistics/statisticsSlice";
import { resetTimer, resumeTimer } from "../features/timer/timerSlice";
import { getTimerPhase, getTimerStatus } from "../features/timer/timerStatus";

// The clock face changes once a second, so it is sent once a second. Faster
// would be hundreds of events nobody can see.
const BROADCAST_INTERVAL_MS = 1000;

/**
 * Brings the main window forward so the coach's question can be seen.
 *
 * Deliberately not awaited and never allowed to throw: the question matters
 * more than the window arriving in front, and a rejected promise here would
 * otherwise surface as an unhandled rejection while the user is mid-session.
 */
function surfaceMainWindow() {
  showMainWindow().catch(() => {});
}

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
  // Pausing and finishing from the focus window ask the same question they ask
  // anywhere else, and the dialog opens here rather than there: the focus
  // window draws the timer and never calls the API, so the coach cannot live
  // in it without giving it a second job.
  const { openPauseCoach, openFinishCoach } = useFocusCoach();
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

    // The same four intentions the main window's own controls express. The
    // focus window sends one; what it means is decided here.
    listenForTimerCommands((command) => {
      // Pausing and finishing are decisions, so they open the coach instead of
      // acting. It asks in the main window, which is brought forward for it -
      // a question with a text field does not belong in a 240 pixel window,
      // and answering it means leaving the work anyway.
      //
      // The coach dispatches the pause or the finish once the user has chosen,
      // so the command still ends in exactly one timer action.
      if (command === TIMER_COMMANDS.pause) {
        surfaceMainWindow();
        openPauseCoach();
      } else if (command === TIMER_COMMANDS.finish) {
        surfaceMainWindow();
        openFinishCoach();
      } else if (command === TIMER_COMMANDS.resume) {
        // Resuming is not an interruption; there is nothing to ask about.
        dispatch(resumeTimer(Date.now()));
      } else if (command === TIMER_COMMANDS.reset) {
        // Reset throws the session away rather than interrupting it, and it is
        // already a deliberate act in a window this small.
        dispatch(resetTimer());
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
  }, [dispatch, openPauseCoach, openFinishCoach]);
}
