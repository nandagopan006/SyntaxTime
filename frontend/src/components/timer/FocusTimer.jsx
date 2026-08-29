import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchTodayStatistics } from "../../features/statistics/statisticsSlice";
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
 * countdown runs in useTimer and saving happens through studyService, so this
 * component composes the two rather than owning either.
 */
function FocusTimer() {
  const dispatch = useDispatch();
  const timer = useSelector((state) => state.timer);

  // A snapshot of the finished session. Kept in local state because the Redux
  // timer is cleared as soon as the session is saved, and the summary must
  // stay on screen after that.
  const [completedSession, setCompletedSession] = useState(null);
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

    const plannedMinutes = Math.round(timer.durationSeconds / 60);
    const session = {
      planned_minutes: plannedMinutes,
      focused_minutes: toFocusedMinutes(timer.elapsedFocusSeconds, plannedMinutes),
      subject: timer.subject,
      topic: timer.topic,
      started_at: timer.startedAt,
      completed_at: new Date().toISOString(),
      status: "completed",
      notes: "",
    };

    setCompletedSession(session);
    saveSession(session);
    // The timer values are frozen once the session completes, so this only
    // needs to run at the moment it finishes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isCompleted]);

  async function saveSession(session) {
    setSaveState("saving");
    setSaveError("");

    try {
      await createStudySession(session);
    } catch (error) {
      // The timer is deliberately left untouched, so the focused time is still
      // counted in today's total and the user can try again.
      setSaveState("failed");
      setSaveError(getErrorMessage(error, "Could not save this session."));
      return;
    }

    setSaveState("saved");

    // These two belong together. The refreshed total now includes the minutes
    // just saved, and clearing the timer removes the same minutes from the
    // active contribution, so the session is counted exactly once.
    await dispatch(fetchTodayStatistics());
    dispatch(clearTimer());
  }

  function handleStart() {
    dispatch(startTimer({ startedAt: new Date().toISOString(), now: Date.now() }));
  }

  /** Dismisses the finished session and returns the card to its idle state. */
  function handleDone() {
    hasSavedRef.current = false;
    setCompletedSession(null);
    setSaveState("idle");
    setSaveError("");
    dispatch(clearTimer());
  }

  const selectedMinutes = Math.round(timer.durationSeconds / 60);
  const isActive = timer.isRunning || timer.isPaused;

  if (completedSession) {
    return (
      <section className="bg-surface border border-rule rounded-lg p-8">
        <h2 className="font-display text-2xl text-ink">Session complete</h2>

        <p className="mt-6 text-ink-muted text-sm">Focused</p>
        <p className="font-display text-5xl text-ink tabular-nums">
          {completedSession.focused_minutes} min
        </p>

        <dl className="mt-6 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-muted w-20">Subject</dt>
            <dd className="text-ink">{completedSession.subject || "General Study"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted w-20">Topic</dt>
            <dd className="text-ink">{completedSession.topic || "No topic added"}</dd>
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
              <p className="mt-1 text-sm text-ink-muted">
                This session is not in your history yet, and is still counted in
                today&apos;s total below.
              </p>
              <button
                type="button"
                onClick={() => saveSession(completedSession)}
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
            className="mt-4 block rounded bg-ink px-5 py-2.5 text-sm text-parchment disabled:opacity-50"
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
        onReset={() => dispatch(resetTimer())}
        onFinish={() => dispatch(finishTimer(Date.now()))}
      />
    </section>
  );
}

export default FocusTimer;
