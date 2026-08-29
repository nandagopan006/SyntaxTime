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
import {
  SUBJECT_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
  buildSessionPayload,
} from "../../utils/studySession";
import Button from "../ui/Button";
import BreakTimer from "./BreakTimer";
import DurationSelector from "./DurationSelector";
import SessionCompletion from "./SessionCompletion";
import TimerControls from "./TimerControls";
import TimerDial from "./TimerDial";

const DEFAULT_MINUTES = 25;

/**
 * The one word describing what the timer is doing.
 *
 * Written out rather than shown only as a colour, so the state is readable
 * without seeing the ring.
 */
function getTimerStatus(timer) {
  if (timer.isPaused) return "Paused";
  if (timer.isRunning) return "Focus";
  return "Ready";
}

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
      <section className="surface-card p-8">
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
    <section className="surface-card p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="section-eyebrow font-sans">Focus session</h2>

        {isActive && (
          <p className="text-sm text-ink-muted">
            {timer.subject || "General Study"}
            <span className="text-ink-faint"> · {timer.topic || "No topic added"}</span>
          </p>
        )}
      </div>

      {/* The countdown leads. Everything needed to set one up sits below it,
          so the first thing on the page is always the study itself. */}
      <div className="mt-6">
        <TimerDial
          remainingSeconds={timer.remainingSeconds}
          durationSeconds={timer.durationSeconds}
          status={getTimerStatus(timer)}
          isBreak={false}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
          <Button variant="quiet" onClick={() => dispatch(enterFocusMode())}>
            <Maximize2 size={16} aria-hidden="true" />
            Focus mode
          </Button>
        )}
      </div>

      {/* Mentioned once, quietly, where the controls are. A shortcut nobody
          knows about is not a shortcut. */}
      {isActive && (
        <p className="mt-4 text-center text-xs text-ink-faint">
          Press <kbd className="rounded-sm border border-rule bg-surface-sunken px-1.5 py-0.5 font-sans">Space</kbd> to
          {" "}
          {timer.isRunning ? "pause" : "resume"}
        </p>
      )}

      <div className="mt-8 space-y-5 border-t border-rule pt-6">
        {/* The length is fixed once a session starts, so the picker would only
            be a disabled control taking up room the timer wants. */}
        {!isActive && (
          <DurationSelector
            selectedMinutes={selectedMinutes}
            onSelect={(minutes) => dispatch(setDuration(minutes * 60))}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-ink-muted"
              htmlFor="subject"
            >
              Subject <span className="text-ink-faint">(optional)</span>
            </label>
            <input
              id="subject"
              type="text"
              value={timer.subject}
              onChange={(event) => dispatch(setSubject(event.target.value))}
              placeholder="JavaScript"
              maxLength={SUBJECT_MAX_LENGTH}
              className="field-control mt-1.5"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-ink-muted"
              htmlFor="topic"
            >
              Topic <span className="text-ink-faint">(optional)</span>
            </label>
            <input
              id="topic"
              type="text"
              value={timer.topic}
              onChange={(event) => dispatch(setTopic(event.target.value))}
              placeholder="Promises"
              maxLength={TOPIC_MAX_LENGTH}
              className="field-control mt-1.5"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default FocusTimer;
