import { Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { selectLiveTodayFocusSeconds } from "../../features/statistics/statisticsSlice";
import { useFocusCoach } from "../../context/useFocusCoach";
import {
  resetTimer,
  resumeTimer,
} from "../../features/timer/timerSlice";
import {
  getElapsedSeconds,
  getTimerPhase,
  getTimerStatus,
} from "../../features/timer/timerStatus";
import { closeFocusPopup, enterFocusMode } from "../../features/ui/uiSlice";
import { NO_SUBJECT_LABEL, NO_TOPIC_LABEL } from "../../utils/studySession";
import Button from "../ui/Button";
import { formatStudyTime } from "../../utils/formatTime";
import BreakTimer from "./BreakTimer";
import FocusClock from "./FocusClock";
import TimerControls from "./TimerControls";

const POPUP_WIDTH = 320;
const EDGE_MARGIN = 16;
// Roughly the popup's height. Only used to keep the whole card on screen; the
// exact figure does not matter because the clamp below is deliberately lenient.
const POPUP_HEIGHT = 320;

/**
 * Keeps the popup inside the browser window.
 *
 * Applied while dragging and again whenever the window is resized, because a
 * window made smaller can otherwise leave the timer stranded off-screen with
 * no way to reach it.
 */
function clampToViewport(x, y) {
  const maxX = window.innerWidth - POPUP_WIDTH - EDGE_MARGIN;
  const maxY = window.innerHeight - POPUP_HEIGHT - EDGE_MARGIN;

  return {
    x: Math.min(Math.max(x, EDGE_MARGIN), Math.max(maxX, EDGE_MARGIN)),
    y: Math.min(Math.max(y, EDGE_MARGIN), Math.max(maxY, EDGE_MARGIN)),
  };
}

/** The resting place for a desktop utility window: out of the way, bottom right. */
function getRestingPosition() {
  return clampToViewport(
    window.innerWidth - POPUP_WIDTH - EDGE_MARGIN * 2,
    window.innerHeight - POPUP_HEIGHT - EDGE_MARGIN * 2
  );
}



/*
  A compact floating view of the session already running.

  It owns no timer of its own: every value comes from timerSlice and every
  button dispatches the same action the Home card dispatches. That is what
  keeps the two views from ever disagreeing, and why closing this popup cannot
  disturb the session.
*/
function FocusTimerPopup() {
  const dispatch = useDispatch();
  // The same dialog the Home card and Focus Mode open. Three views, one coach.
  const { openPauseCoach, openFinishCoach } = useFocusCoach();
  const navigate = useNavigate();

  const timer = useSelector((state) => state.timer);
  const liveTodaySeconds = useSelector(selectLiveTodayFocusSeconds);

  const [position, setPosition] = useState(getRestingPosition);
  // Holds the grab point during a drag. A ref rather than state, because it
  // changes on every pointer move and nothing needs to re-render for it.
  const dragOffset = useRef(null);

  useEffect(() => {
    function keepOnScreen() {
      setPosition((current) => clampToViewport(current.x, current.y));
    }

    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, []);

  function handlePointerDown(event) {
    // Only the bar itself drags. Without this, pressing the close button would
    // also begin a drag and the click could be swallowed.
    if (event.target.closest("button")) {
      return;
    }

    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragOffset.current) {
      return;
    }
    setPosition(
      clampToViewport(
        event.clientX - dragOffset.current.x,
        event.clientY - dragOffset.current.y
      )
    );
  }

  function handlePointerUp(event) {
    dragOffset.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  /** Hides the popup. The session keeps running exactly as it was. */
  function handleClosePopup() {
    dispatch(closeFocusPopup());
  }

  /**
   * Asks why, then ends the session and opens Home, where the completion form
   * lives. The popup deliberately has no form of its own, so a finished session
   * is only ever recorded in one place.
   *
   * The coach dispatches the finish itself; what is handed to it here is only
   * what the popup needs afterwards. That is what keeps one finish a finish.
   */
  function handleFinish() {
    openFinishCoach({
      afterConfirm: () => {
        dispatch(closeFocusPopup());
        navigate("/");
      },
    });
  }

  /** Sends the user to Home to record the session that has just finished. */
  function handleRecordSession() {
    dispatch(closeFocusPopup());
    navigate("/");
  }

  const isBreak = timer.mode === "break";
  const hasSession = timer.isRunning || timer.isPaused || timer.isCompleted;

  return (
    <section
      aria-label="Focus timer"
      style={{ left: position.x, top: position.y, width: POPUP_WIDTH }}
      className="fixed z-50 animate-surface-in overflow-hidden rounded-lg border border-rule-strong bg-surface shadow-popup"
    >
      <header
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex cursor-grab select-none items-center justify-between border-b border-rule bg-surface-sunken/60 px-4 py-2.5 active:cursor-grabbing"
      >
        <span className="text-sm text-ink font-display">
          {isBreak ? "Break" : "Focus"} &middot; SyntaxTime
        </span>

        <button
          type="button"
          onClick={handleClosePopup}
          aria-label="Close focus timer"
          className="rounded-sm p-1 text-ink-faint transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {!hasSession ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-ink-muted">No active focus session.</p>
          <Button variant="primary" onClick={handleRecordSession} className="mt-4">
            Start focus
          </Button>
        </div>
      ) : isBreak ? (
        /* A break is the same shared timer, so the popup shows the same
           component Home shows rather than a second break view of its own. */
        <div className="px-5 pb-5 pt-4">
          <BreakTimer compact />

          <p className="mt-4 border-t border-rule pt-3 text-center text-sm text-ink-muted">
            Today: <span className="text-ink tabular-nums">
              {formatStudyTime(liveTodaySeconds)}
            </span>
          </p>
        </div>
      ) : (
        <div className="px-5 pb-5 pt-4">
          {/* The smallest of the clock's three sizes. Same instrument as Home
              and focus mode, so the popup is never a second design. */}
          <FocusClock
            remainingSeconds={timer.remainingSeconds}
            durationSeconds={timer.durationSeconds}
            elapsedSeconds={getElapsedSeconds(timer)}
            status={getTimerStatus(timer)}
            phase={getTimerPhase(timer)}
            size="sm"
          />

          <p className="mt-4 truncate text-center text-sm text-ink">
            {timer.subject || NO_SUBJECT_LABEL}
          </p>
          <p className="truncate text-center text-sm text-ink-faint">
            {timer.topic || NO_TOPIC_LABEL}
          </p>

          <p className="mt-4 border-t border-rule pt-3 text-center text-sm text-ink-muted">
            Today:{" "}
            <span className="text-ink tabular-nums">
              {formatStudyTime(liveTodaySeconds)}
            </span>
          </p>

          <div className="mt-4">
            {timer.isCompleted ? (
              <Button variant="primary" onClick={handleRecordSession} fullWidth>
                Record session
              </Button>
            ) : (
              <TimerControls
                compact
                isRunning={timer.isRunning}
                isPaused={timer.isPaused}
                canStart={false}
                onPause={() => openPauseCoach()}
                onResume={() => dispatch(resumeTimer(Date.now()))}
                onReset={() => dispatch(resetTimer())}
                onFinish={handleFinish}
              />
            )}
          </div>

          {!timer.isCompleted && (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => dispatch(enterFocusMode())}
              fullWidth
              className="mt-2"
            >
              <Maximize2 size={15} aria-hidden="true" />
              Focus mode
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export default FocusTimerPopup;
