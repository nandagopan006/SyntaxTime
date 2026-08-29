import { Minimize2 } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { selectLiveTodayFocusSeconds } from "../../features/statistics/statisticsSlice";
import {
  finishTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
} from "../../features/timer/timerSlice";
import { exitFocusMode } from "../../features/ui/uiSlice";
import { formatStudyTime, formatTime } from "../../utils/formatTime";
import BreakTimer from "./BreakTimer";
import TimerControls from "./TimerControls";

/** Returns the short status word shown above the countdown. */
function getStatusLabel(timer) {
  if (timer.isCompleted) return "Session complete";
  if (timer.isPaused) return "Paused";
  return "Focusing";
}

/*
  The distraction-free study view.

  Everything here is read from timerSlice and every button dispatches the same
  action the Home card dispatches, so entering and leaving this view cannot
  change what the timer is doing. Only ui.isFocusModeActive changes.
*/
function FocusMode() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const timer = useSelector((state) => state.timer);
  const liveTodaySeconds = useSelector(selectLiveTodayFocusSeconds);

  /** Leaves Focus Mode without changing the active timer. */
  function handleExit() {
    dispatch(exitFocusMode());
  }

  // Escape leaves the view and nothing else. It must never pause, reset or
  // finish a session, because a mistyped key would then cost real study time.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        dispatch(exitFocusMode());
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  /**
   * Leaves Focus Mode and opens Home, where the completion form lives.
   * Focus Mode deliberately has no form of its own, so a finished session is
   * only ever recorded in one place.
   */
  function handleRecordSession() {
    dispatch(exitFocusMode());
    navigate("/");
  }

  const isBreak = timer.mode === "break";
  const hasSession = timer.isRunning || timer.isPaused || timer.isCompleted;

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
      className="fixed inset-0 z-[60] flex flex-col bg-parchment animate-focus-mode-in"
    >
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-lg text-ink-faint">SyntaxTime</span>

        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-2 rounded border border-rule px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
        >
          <Minimize2 size={16} aria-hidden="true" />
          Exit focus mode
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        {!hasSession ? (
          <div>
            <p className="font-display text-3xl text-ink">No session running</p>
            <p className="mt-3 text-sm text-ink-muted">
              Leave focus mode and start a session from Home.
            </p>
          </div>
        ) : isBreak ? (
          <BreakTimer />
        ) : (
          <div className="w-full max-w-2xl">
            <p className="font-display text-3xl text-ink sm:text-4xl">
              {timer.subject || "General Study"}
            </p>
            <p className="mt-2 text-base text-ink-muted">
              {timer.topic || "No topic added"}
            </p>

            <p
              className="mt-10 font-display text-7xl text-ink tabular-nums sm:text-8xl"
              role="timer"
              aria-live="off"
            >
              {formatTime(timer.remainingSeconds)}
            </p>

            <p className="mt-4 text-xs uppercase tracking-[0.15em] text-brass">
              {getStatusLabel(timer)}
            </p>

            <div className="mt-12 flex justify-center">
              {timer.isCompleted ? (
                <button
                  type="button"
                  onClick={handleRecordSession}
                  className="rounded bg-ink px-5 py-2.5 text-sm text-parchment focus-visible:outline-2 focus-visible:outline-brass"
                >
                  Record session
                </button>
              ) : (
                <TimerControls
                  isRunning={timer.isRunning}
                  isPaused={timer.isPaused}
                  canStart={false}
                  onPause={() => dispatch(pauseTimer(Date.now()))}
                  onResume={() => dispatch(resumeTimer(Date.now()))}
                  onReset={() => dispatch(resetTimer())}
                  onFinish={() => dispatch(finishTimer(Date.now()))}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-rule px-6 py-4 text-center text-sm text-ink-muted">
        Today:{" "}
        <span className="text-ink tabular-nums">
          {formatStudyTime(liveTodaySeconds)}
        </span>
      </footer>
    </section>
  );
}

export default FocusMode;
