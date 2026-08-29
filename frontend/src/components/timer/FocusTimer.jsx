import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchRecentSessions,
  fetchWeeklyStatistics,
  saveStudySession,
} from "../../features/statistics/statisticsSlice";
import {
  clearTimer,
  finishTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  setDuration,
  setSubject,
  setTopic,
  startBreak,
  startTimer,
} from "../../features/timer/timerSlice";
import { enterFocusMode } from "../../features/ui/uiSlice";
import { formatTime } from "../../utils/formatTime";
import { buildSessionPayload } from "../../utils/studySession";
import BreakTimer from "./BreakTimer";
import DurationSelector from "./DurationSelector";
import SessionCompletion from "./SessionCompletion";
import TimerControls from "./TimerControls";

const DEFAULT_MINUTES = 25;

/**
 * The focus session card on Home.
 *
 * Reads the timer from Redux and turns button clicks into timer actions. The
 * countdown runs in useTimer, the completion form lives in SessionCompletion,
 * and saving goes through studyService, so this component coordinates rather
 * than owning any of them.
 */
function FocusTimer() {
  const dispatch = useDispatch();
  const timer = useSelector((state) => state.timer);

  // A snapshot of the finished session, taken before anything is saved. The
  // Redux timer is cleared once the save succeeds, and the summary has to stay
  // on screen after that.
  const [completedSession, setCompletedSession] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | failed
  const [saveError, setSaveError] = useState("");

  // One finished session must produce exactly one saved record, however many
  // times the save is triggered.
  const hasSavedRef = useRef(false);

  // Start on a sensible default so the user can press Start immediately. A
  // break carries its own length, so it must not be overwritten here.
  useEffect(() => {
    if (timer.mode === "focus" && timer.durationSeconds === 0) {
      dispatch(setDuration(DEFAULT_MINUTES * 60));
    }
  }, [timer.mode, timer.durationSeconds, dispatch]);

  // Both ways of finishing - the countdown reaching zero and the Finish button -
  // set isCompleted, so the completion form opens from a single place.
  useEffect(() => {
    // A break reaches zero through the same action, but it has nothing to
    // record, so it must never open the completion form.
    if (!timer.isCompleted || timer.mode !== "focus") {
      return;
    }

    // The functional form keeps the first snapshot, so a re-render can never
    // overwrite it with values the user has since edited.
    setCompletedSession(
      (existing) =>
        existing ?? {
          durationSeconds: timer.durationSeconds,
          elapsedFocusSeconds: timer.elapsedFocusSeconds,
          startedAt: timer.startedAt,
          subject: timer.subject,
          topic: timer.topic,
        }
    );
    // Depending only on these two means this runs when the session ends,
    // rather than on every tick of the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.isCompleted, timer.mode]);

  async function saveSession(details) {
    if (hasSavedRef.current) {
      return;
    }
    hasSavedRef.current = true;

    setSaveState("saving");
    setSaveError("");

    // One action writes the session, refreshes today's total and clears the
    // timer, so the minutes can never be counted in the total and the running
    // session at the same time.
    const result = await dispatch(
      saveStudySession(buildSessionPayload(completedSession, details))
    );

    if (saveStudySession.rejected.match(result)) {
      // Let the user try again, and leave the timer untouched so the focused
      // time is still counted in today's total.
      hasSavedRef.current = false;
      setSaveState("failed");
      setSaveError(result.payload ?? "Unable to save this session.");
      return;
    }

    setSaveState("saved");

    // The rest of the dashboard is not part of the live total, so it catches
    // up on its own.
    dispatch(fetchWeeklyStatistics());
    dispatch(fetchRecentSessions());
  }

  /** Saves the session together with whatever details the user filled in. */
  function handleSaveSession(details) {
    saveSession(details);
  }

  /** Saves the session without the optional details. Skip never discards it. */
  function handleSkipDetails() {
    saveSession({
      subject: completedSession.subject,
      topic: completedSession.topic,
      notes: "",
    });
  }

  /** Closes the finished session and returns the card to its idle state. */
  function closeCompletedSession() {
    hasSavedRef.current = false;
    setCompletedSession(null);
    setSaveState("idle");
    setSaveError("");
    dispatch(clearTimer());
  }

  /**
   * Starts the break using the length the user chose.
   *
   * Only reachable once the session has been saved, and it runs on the same
   * timer, so the break can neither be mistaken for study time nor create a
   * second countdown.
   */
  function handleStartBreak(minutes) {
    closeCompletedSession();
    dispatch(startBreak({ durationSeconds: minutes * 60, now: Date.now() }));
  }

  /** Declines the break. The saved session is untouched either way. */
  function handleSkipBreak() {
    closeCompletedSession();
  }

  // Checked before the completion form, because a break only ever starts once
  // that form has been closed.
  if (timer.mode === "break") {
    return (
      <section className="bg-surface border border-rule rounded-lg p-8">
        <BreakTimer />
      </section>
    );
  }

  if (completedSession) {
    return (
      <SessionCompletion
        focusedSeconds={completedSession.elapsedFocusSeconds}
        defaultSubject={completedSession.subject}
        defaultTopic={completedSession.topic}
        saveState={saveState}
        errorMessage={saveError}
        onSave={handleSaveSession}
        onSkip={handleSkipDetails}
        onStartBreak={handleStartBreak}
        onSkipBreak={handleSkipBreak}
      />
    );
  }

  const selectedMinutes = Math.round(timer.durationSeconds / 60);
  const isActive = timer.isRunning || timer.isPaused;

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

      <div className="flex flex-wrap items-center gap-3">
        <TimerControls
          isRunning={timer.isRunning}
          isPaused={timer.isPaused}
          canStart={timer.durationSeconds > 0}
          onStart={() =>
            dispatch(startTimer({ startedAt: new Date().toISOString(), now: Date.now() }))
          }
          onPause={() => dispatch(pauseTimer(Date.now()))}
          onResume={() => dispatch(resumeTimer(Date.now()))}
          onReset={() => dispatch(resetTimer())}
          onFinish={() => dispatch(finishTimer(Date.now()))}
        />

        {/* Offered only once a session exists, because focus mode has nothing
            to show before then. It changes the view and never the timer. */}
        {isActive && (
          <button
            type="button"
            onClick={() => dispatch(enterFocusMode())}
            className="flex items-center gap-2 rounded border border-rule px-5 py-2.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
          >
            <Maximize2 size={16} aria-hidden="true" />
            Focus mode
          </button>
        )}
      </div>
    </section>
  );
}

export default FocusTimer;
