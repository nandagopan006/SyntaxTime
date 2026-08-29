import { useDispatch, useSelector } from "react-redux";

import {
  clearTimer,
  pauseTimer,
  resumeTimer,
} from "../../features/timer/timerSlice";
import { formatTime } from "../../utils/formatTime";

/*
  The short break offered after a focus session has been saved.

  It runs on the same timerSlice as a focus session, with mode set to "break".
  That is the only difference, and it is what keeps break minutes out of every
  study total: the reducer refuses to add them to elapsedFocusSeconds, and no
  StudySession is ever created from a break.

  Home and the compact popup both render this component, so ending a break
  means the same thing wherever the user happens to be looking.
*/
function BreakTimer({ compact = false }) {
  const dispatch = useDispatch();
  const timer = useSelector((state) => state.timer);

  /** Ends the break and returns the timer to its ready state. */
  function handleEndBreak() {
    dispatch(clearTimer());
  }

  const primaryButton = `rounded bg-ink text-sm text-parchment focus-visible:outline-2 focus-visible:outline-brass ${
    compact ? "px-3 py-2" : "px-5 py-2.5"
  }`;
  const secondaryButton = `rounded border border-rule text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass ${
    compact ? "px-3 py-2" : "px-5 py-2.5"
  }`;

  if (timer.isCompleted) {
    return (
      <div className={compact ? "text-center" : "text-center py-4"}>
        <p className="text-xs uppercase tracking-[0.15em] text-brass">
          Break complete
        </p>

        <p
          className={`mt-3 font-display text-ink ${compact ? "text-xl" : "text-3xl"}`}
        >
          Ready for another session?
        </p>

        <button
          type="button"
          onClick={handleEndBreak}
          className={`mt-6 ${primaryButton} ${compact ? "w-full" : ""}`}
        >
          Start focus
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-[0.15em] text-brass">
        {timer.isPaused ? "Break paused" : "Break"}
      </p>

      <p
        className={`mt-3 font-display text-ink tabular-nums ${
          compact ? "text-5xl" : "text-7xl"
        }`}
        role="timer"
        aria-live="off"
      >
        {formatTime(timer.remainingSeconds)}
      </p>

      <p className={`mt-3 text-ink-muted ${compact ? "text-xs" : "text-sm"}`}>
        Step away for a moment. Break time is not counted as study time.
      </p>

      <div
        className={
          compact ? "mt-4 grid grid-cols-2 gap-2" : "mt-8 flex justify-center gap-3"
        }
      >
        {timer.isRunning ? (
          <button
            type="button"
            onClick={() => dispatch(pauseTimer(Date.now()))}
            className={primaryButton}
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => dispatch(resumeTimer(Date.now()))}
            className={primaryButton}
          >
            Resume
          </button>
        )}

        <button type="button" onClick={handleEndBreak} className={secondaryButton}>
          End break
        </button>
      </div>
    </div>
  );
}

export default BreakTimer;
