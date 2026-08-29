import { Maximize2, X } from "lucide-react";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { selectLiveTodayFocusSeconds } from "../../features/statistics/statisticsSlice";
import {
  finishTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
} from "../../features/timer/timerSlice";
import { closeFocusPopup, enterFocusMode } from "../../features/ui/uiSlice";
import Button from "../ui/Button";
import { formatStudyTime, formatTime } from "../../utils/formatTime";
import BreakTimer from "./BreakTimer";
import TimerControls from "./TimerControls";

const POPUP_WIDTH = 320;
const EDGE_MARGIN = 16;

/** Keeps the popup inside the browser window while it is dragged. */
function clampToViewport(x, y) {
  const maxX = window.innerWidth - POPUP_WIDTH - EDGE_MARGIN;
  const maxY = window.innerHeight - 120;

  return {
    x: Math.min(Math.max(x, EDGE_MARGIN), Math.max(maxX, EDGE_MARGIN)),
    y: Math.min(Math.max(y, EDGE_MARGIN), Math.max(maxY, EDGE_MARGIN)),
  };
}

/** Returns the short status word shown under the popup title. */
function getStatusLabel(timer) {
  if (timer.isCompleted) return "Session complete";
  if (timer.isPaused) return "Paused";
  if (timer.isRunning) return "Focus";
  return "Ready";
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
  const navigate = useNavigate();

  const timer = useSelector((state) => state.timer);
  const liveTodaySeconds = useSelector(selectLiveTodayFocusSeconds);

  const [position, setPosition] = useState(() =>
    clampToViewport(window.innerWidth - POPUP_WIDTH - 24, window.innerHeight - 400)
  );
  // Holds the grab point during a drag. A ref rather than state, because it
  // changes on every pointer move and nothing needs to re-render for it.
  const dragOffset = useRef(null);

  function handlePointerDown(event) {
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
   * Ends the session and opens Home, where the completion form lives.
   * The popup deliberately has no form of its own, so a finished session is
   * only ever recorded in one place.
   */
  function handleFinish() {
    dispatch(finishTimer(Date.now()));
    dispatch(closeFocusPopup());
    navigate("/");
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
          <p className="section-eyebrow text-center">{getStatusLabel(timer)}</p>

          <p
            role="timer"
            aria-live="off"
            className="mt-2 text-center text-5xl leading-none text-ink tabular-nums font-display"
          >
            {formatTime(timer.remainingSeconds)}
          </p>

          <p className="mt-4 truncate text-center text-sm text-ink">
            {timer.subject || "General Study"}
          </p>
          <p className="truncate text-center text-sm text-ink-faint">
            {timer.topic || "No topic added"}
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
                onPause={() => dispatch(pauseTimer(Date.now()))}
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
