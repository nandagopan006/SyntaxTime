import { Minimize2 } from "lucide-react";
import { useEffect, useRef } from "react";
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
import Button from "../ui/Button";
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

  const exitButtonRef = useRef(null);

  /** Leaves Focus Mode without changing the active timer. */
  function handleExit() {
    dispatch(exitFocusMode());
  }

  // Focus moves into the overlay when it opens and back to whatever opened it
  // when it closes, so a keyboard user is never left tabbing through a page
  // they can no longer see.
  useEffect(() => {
    const opener = document.activeElement;
    exitButtonRef.current?.focus();

    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus();
      }
    };
  }, []);

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
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-parchment animate-focus-mode-in"
    >
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-lg text-ink-faint">SyntaxTime</span>

        <Button ref={exitButtonRef} size="sm" variant="secondary" onClick={handleExit}>
          <Minimize2 size={15} aria-hidden="true" />
          Exit focus mode
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        {!hasSession ? (
          <div>
            <p className="text-3xl text-ink font-display">No session running</p>
            <p className="mt-3 text-sm text-ink-muted">
              Leave focus mode and start a session from Home.
            </p>
          </div>
        ) : isBreak ? (
          <BreakTimer />
        ) : (
          <div className="w-full max-w-2xl">
            <p className="text-2xl text-ink break-words sm:text-3xl font-display">
              {timer.subject || "General Study"}
            </p>
            <p className="mt-1.5 text-base text-ink-muted break-words">
              {timer.topic || "No topic added"}
            </p>

            {/* Far larger than anywhere else in the application. In focus mode
                the time is the only thing worth looking at. */}
            <p
              className="mt-10 text-[clamp(4rem,16vmin,8rem)] leading-none text-ink tabular-nums font-display"
              role="timer"
              aria-live="off"
            >
              {formatTime(timer.remainingSeconds)}
            </p>

            <p className="mt-5 section-eyebrow">{getStatusLabel(timer)}</p>

            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {timer.isCompleted ? (
                <Button variant="primary" onClick={handleRecordSession}>
                  Record session
                </Button>
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

      <footer className="border-t border-rule bg-surface/50 px-6 py-4 text-center text-sm text-ink-muted">
        Today:{" "}
        <span className="text-ink tabular-nums">
          {formatStudyTime(liveTodaySeconds)}
        </span>
      </footer>
    </section>
  );
}

export default FocusMode;
