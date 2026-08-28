import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  clearTimer,
  finishTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  setDuration,
  setSubject,
  setTopic,
  startTimer,
} from "../../features/timer/timerSlice";
import { getErrorMessage } from "../../services/api";
import { createStudySession } from "../../services/studyService";
import { formatTime, toFocusedMinutes } from "../../utils/formatTime";
import DurationSelector from "./DurationSelector";
import TimerControls from "./TimerControls";

const DEFAULT_MINUTES = 25;

/**
 * The focus session card on Home.
 *
 * Reads the timer from Redux and turns button clicks into timer actions. The
 * countdown itself runs in useTimer, and saving happens through studyService,
 * so this component only composes the two.
 */
function FocusTimer() {
  const dispatch = useDispatch();
  const timer = useSelector((state) => state.timer);

  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | failed
  const [saveError, setSaveError] = useState("");

  // A session must be saved once, even though it can complete two ways: the
  // countdown reaching zero, or the user pressing Finish.
  const hasSavedRef = useRef(false);

  // Start on a sensible default so the user can press Start immediately.
  useEffect(() => {
    if (timer.durationSeconds === 0) {
      dispatch(setDuration(DEFAULT_MINUTES * 60));
    }
  }, [timer.durationSeconds, dispatch]);

  useEffect(() => {
    if (!timer.isCompleted || hasSavedRef.current) {
      return;
    }

    hasSavedRef.current = true;
    saveCompletedSession();
    // saveCompletedSession reads the timer values at completion time, which do
    // not change afterwards, so this only needs to run when the session ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isCompleted]);

  async function saveCompletedSession() {
    const plannedMinutes = Math.round(timer.durationSeconds / 60);

    setSaveState("saving");
    setSaveError("");

    try {
      await createStudySession({
        planned_minutes: plannedMinutes,
        focused_minutes: toFocusedMinutes(timer.elapsedFocusSeconds, plannedMinutes),
        subject: timer.subject,
        topic: timer.topic,
        started_at: timer.startedAt,
        completed_at: new Date().toISOString(),
        status: "completed",
        notes: "",
      });
      setSaveState("saved");
    } catch (error) {
      setSaveState("failed");
      setSaveError(getErrorMessage(error, "Could not save this session."));
    }
  }

  function handleStart() {
    dispatch(
      startTimer({ startedAt: new Date().toISOString(), now: Date.now() })
    );
  }

  function handleReset() {
    dispatch(resetTimer());
  }

  /** Clears the finished session and returns the card to its idle state. */
  function handleDone() {
    hasSavedRef.current = false;
    setSaveState("idle");
    setSaveError("");
    dispatch(clearTimer());
    dispatch(setDuration(DEFAULT_MINUTES * 60));
  }

  const selectedMinutes = Math.round(timer.durationSeconds / 60);
  const isActive = timer.isRunning || timer.isPaused;

  if (timer.isCompleted) {
    return (
      <section className="bg-surface border border-rule rounded-lg p-8">
        <h2 className="font-display text-2xl text-ink">Session complete</h2>

        <p className="mt-6 text-ink-muted text-sm">Focused</p>
        <p className="font-display text-5xl text-ink tabular-nums">
          {toFocusedMinutes(timer.elapsedFocusSeconds, selectedMinutes)} min
        </p>

        <dl className="mt-6 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-muted w-20">Subject</dt>
            <dd className="text-ink">{timer.subject || "General Study"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted w-20">Topic</dt>
            <dd className="text-ink">{timer.topic || "No topic added"}</dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-rule pt-6">
          {saveState === "saving" && (
            <p className="text-sm text-ink-muted">Saving session...</p>
          )}

          {saveState === "saved" && (
            <p className="text-sm text-forest">Session saved.</p>
          )}

          {saveState === "failed" && (
            <div>
              <p className="text-sm text-burgundy">{saveError}</p>
              <button
                type="button"
                onClick={saveCompletedSession}
                className="mt-3 rounded border border-rule px-4 py-2 text-sm text-ink hover:bg-surface-sunken"
              >
                Try again
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleDone}
            disabled={saveState === "saving"}
            className="mt-4 rounded bg-ink px-5 py-2.5 text-sm text-parchment disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface border border-rule rounded-lg p-8">
      <h2 className="font-display text-2xl text-ink mb-6">Focus session</h2>

      <DurationSelector
        selectedMinutes={selectedMinutes}
        onSelect={(minutes) => dispatch(setDuration(minutes * 60))}
        disabled={isActive}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink-muted" htmlFor="subject">
            Subject <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id="subject"
            type="text"
            value={timer.subject}
            onChange={(event) => dispatch(setSubject(event.target.value))}
            placeholder="JavaScript"
            className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted" htmlFor="topic">
            Topic <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            id="topic"
            type="text"
            value={timer.topic}
            onChange={(event) => dispatch(setTopic(event.target.value))}
            placeholder="Promises"
            className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="my-10 text-center">
        <p
          className="font-display text-7xl text-ink tabular-nums"
          role="timer"
          aria-live="off"
        >
          {formatTime(timer.remainingSeconds)}
        </p>

        {isActive && (
          <p className="mt-2 text-sm text-ink-muted">
            {timer.subject || "General Study"} &middot;{" "}
            {timer.topic || "No topic added"}
            {timer.isPaused && " · Paused"}
          </p>
        )}
      </div>

      <TimerControls
        isRunning={timer.isRunning}
        isPaused={timer.isPaused}
        canStart={timer.durationSeconds > 0}
        onStart={handleStart}
        onPause={() => dispatch(pauseTimer(Date.now()))}
        onResume={() => dispatch(resumeTimer(Date.now()))}
        onReset={handleReset}
        onFinish={() => dispatch(finishTimer(Date.now()))}
      />
    </section>
  );
}

export default FocusTimer;
