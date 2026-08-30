import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchRecentSessions,
  fetchWeeklyStatistics,
  saveStudySession,
  selectLiveTodayFocusSeconds,
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
import {
  getElapsedSeconds,
  getTimerPhase,
  getTimerStatus,
} from "../../features/timer/timerStatus";
import { enterFocusMode } from "../../features/ui/uiSlice";
import { formatStudyTime } from "../../utils/formatTime";
import {
  NO_SUBJECT_LABEL,
  NO_TOPIC_LABEL,
  buildSessionPayload,
} from "../../utils/studySession";
import Button from "../ui/Button";
import BreakTimer from "./BreakTimer";
import FocusClock from "./FocusClock";
import FocusSetup from "./FocusSetup";
import SessionCompletion from "./SessionCompletion";
import TimerControls from "./TimerControls";

const DEFAULT_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;



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
  const liveTodaySeconds = useSelector(selectLiveTodayFocusSeconds);

  // What should happen after this session. Local, because it is a preference
  // for a session that has not started, and because Redux is wiped the moment
  // the session saves - which is exactly when the answer is needed. It is
  // carried across in the completed-session snapshot instead.
  const [wantsBreak, setWantsBreak] = useState(true);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);

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
          // Zero means the user asked not to be offered one.
          breakMinutes: wantsBreak ? breakMinutes : 0,
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
        breakMinutes={completedSession.breakMinutes}
        onStartBreak={handleStartBreak}
        onSkipBreak={handleSkipBreak}
      />
    );
  }

  const selectedMinutes = Math.round(timer.durationSeconds / 60);
  const isActive = timer.isRunning || timer.isPaused;

  // A finished session is no longer running, but the completion form is set up
  // by an effect and so arrives a frame later. Without this the setup form
  // would flash on screen in between, which reads as the session having been
  // thrown away.
  const isFinishing = timer.isCompleted && timer.mode === "focus";

  // Two stages of one feature, not two pages. Before a session the card is a
  // short form; during one it is a clock and nothing else, because the user is
  // studying and everything on screen is competing with that.
  if (!isActive && !isFinishing) {
    return (
      <section className="surface-card p-8">
        <FocusSetup
          selectedMinutes={selectedMinutes}
          status={getTimerStatus(timer)}
          phase={getTimerPhase(timer)}
          subject={timer.subject}
          topic={timer.topic}
          wantsBreak={wantsBreak}
          breakMinutes={breakMinutes}
          canStart={timer.durationSeconds > 0}
          onSelectDuration={(minutes) => dispatch(setDuration(minutes * 60))}
          onSubjectChange={(value) => dispatch(setSubject(value))}
          onTopicChange={(value) => dispatch(setTopic(value))}
          onWantsBreakChange={setWantsBreak}
          onBreakMinutesChange={setBreakMinutes}
          onStart={() =>
            dispatch(
              startTimer({ startedAt: new Date().toISOString(), now: Date.now() })
            )
          }
        />
      </section>
    );
  }

  return (
    <section className="surface-card p-8 animate-surface-in">
      <div className="mt-2">
        <FocusClock
          remainingSeconds={timer.remainingSeconds}
          durationSeconds={timer.durationSeconds}
          elapsedSeconds={getElapsedSeconds(timer)}
          status={getTimerStatus(timer)}
          phase={getTimerPhase(timer)}
        />
      </div>

      {/* What is being studied, directly under the clock and deliberately
          quiet, so the eye falls back onto the time. */}
      <div className="mt-5 text-center">
        <p className="text-base text-ink break-words font-display">
          {timer.subject || NO_SUBJECT_LABEL}
        </p>
        <p className="mt-0.5 text-sm text-ink-faint break-words">
          {timer.topic || NO_TOPIC_LABEL}
        </p>
      </div>

      {/* The one number worth knowing besides the countdown: the same live
          total the popup shows, so the two can never disagree. */}
      <p className="mt-5 text-center text-sm text-ink-muted">
        Today{" "}
        <span className="text-ink tabular-nums">
          {formatStudyTime(liveTodaySeconds)}
        </span>
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {isActive && (
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
        )}

        {/* Changes the view and never the timer. */}
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
    </section>
  );
}

export default FocusTimer;
