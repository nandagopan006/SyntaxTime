import { useDispatch, useSelector } from "react-redux";

import {
  clearTimer,
  pauseTimer,
  resumeTimer,
} from "../../features/timer/timerSlice";
import { formatTime } from "../../utils/formatTime";
import Button from "../ui/Button";

/*
  The short break offered after a focus session has been saved.

  It runs on the same timerSlice as a focus session, with mode set to "break".
  That is the only difference, and it is what keeps break minutes out of every
  study total: the reducer refuses to add them to elapsedFocusSeconds, and no
  StudySession is ever created from a break.

  Visually it is lighter than the focus timer - brass-soft rather than brass,
  no ring - so the two are never mistaken for each other at a glance.

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

  const buttonSize = compact ? "sm" : "md";

  if (timer.isCompleted) {
    return (
      <div className="text-center">
        <p className="section-eyebrow">Break complete</p>

        <p
          className={`mt-3 text-ink font-display ${compact ? "text-xl" : "text-3xl"}`}
        >
          Ready for another session?
        </p>

        <Button
          variant="primary"
          size={buttonSize}
          onClick={handleEndBreak}
          fullWidth={compact}
          className="mt-6"
        >
          Start focus
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="section-eyebrow">
        {timer.isPaused ? "Break paused" : "Break"}
      </p>

      <p
        role="timer"
        aria-live="off"
        className={`mt-3 leading-none text-ink tabular-nums font-display ${
          compact ? "text-5xl" : "text-6xl"
        }`}
      >
        {formatTime(timer.remainingSeconds)}
      </p>

      <p className={`mt-4 text-ink-muted ${compact ? "text-xs" : "text-sm"}`}>
        Step away for a moment. Break time is not counted as study time.
      </p>

      <div
        className={
          compact
            ? "mt-4 grid grid-cols-2 gap-2"
            : "mt-8 flex flex-wrap justify-center gap-3"
        }
      >
        {timer.isRunning ? (
          <Button
            variant="primary"
            size={buttonSize}
            onClick={() => dispatch(pauseTimer(Date.now()))}
            fullWidth={compact}
          >
            Pause
          </Button>
        ) : (
          <Button
            variant="primary"
            size={buttonSize}
            onClick={() => dispatch(resumeTimer(Date.now()))}
            fullWidth={compact}
          >
            Resume
          </Button>
        )}

        <Button
          variant="secondary"
          size={buttonSize}
          onClick={handleEndBreak}
          fullWidth={compact}
        >
          End break
        </Button>
      </div>
    </div>
  );
}

export default BreakTimer;
