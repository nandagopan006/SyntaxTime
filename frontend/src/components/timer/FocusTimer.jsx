import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useFocusCoach } from "../../context/useFocusCoach";
import {
  fetchRecentSessions,
  fetchWeeklyStatistics,
  saveStudySession,
  selectLiveTodayFocusSeconds,
  updateSessionDetails,
} from "../../features/statistics/statisticsSlice";
import {
  clearTimer,
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
  // Pausing and finishing ask why first. The coach dispatches the same timer
  // actions this component used to dispatch directly, once the user decides.
  const { openPauseCoach, openFinishCoach } = useFocusCoach();

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

  // The row the session became. Anything the user writes afterwards is an edit
  // of it rather than a new record, so this is what those edits are sent to.
  const [savedSessionId, setSavedSessionId] = useState(null);

  // The optional details, which are written after the session already exists.
  const [detailsState, setDetailsState] = useState("idle"); // idle | saving | failed
  const [detailsError, setDetailsError] = useState("");

  // Whether the user has finished with the details step, either by writing
  // them or by saying they are done. The break is only offered after that.
  const [isDetailsDone, setIsDetailsDone] = useState(false);

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

  /*
    The session records itself the moment it ends.

    Waiting for a button meant a session that reached zero while the user was
    away from the machine - which is most of them, because the whole point of
    the focus window is that they are working in something else - was still
    only in the browser. Closing the application then lost work that had
    actually been done.

    The details below are optional and always were, so there is nothing to
    wait for. They become an edit of a row that already exists rather than
    part of creating it.
  */
  useEffect(() => {
    if (!completedSession || hasSavedRef.current) {
      return;
    }

    // Whatever was set before starting. The user may not have opened the form
    // yet, and may never open it.
    saveSession({
      subject: completedSession.subject,
      topic: completedSession.topic,
      notes: "",
    });
    // saveSession is recreated on every render and guarded by hasSavedRef, so
    // depending on it would re-run this without adding any safety.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSession]);

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
    setSavedSessionId(result.payload?.session?.id ?? null);

    // The rest of the dashboard is not part of the live total, so it catches
    // up on its own.
    dispatch(fetchWeeklyStatistics());
    dispatch(fetchRecentSessions());
  }

  /**
   * Writes what the user studied onto the session that already exists.
   *
   * If the automatic save failed, there is no row to edit, so this creates it
   * instead - carrying the details with it, so nothing typed is lost to the
   * retry.
   */
  async function handleSaveDetails(details) {
    if (saveState === "failed" || savedSessionId === null) {
      // hasSavedRef was released by the failure, so this is a fresh attempt.
      await saveSession(details);
      // Only move on if that attempt actually worked. saveSession has already
      // shown the error otherwise.
      setIsDetailsDone((done) => done || hasSavedRef.current);
      return;
    }

    setDetailsState("saving");
    setDetailsError("");

    const result = await dispatch(
      updateSessionDetails({ id: savedSessionId, details })
    );

    if (updateSessionDetails.rejected.match(result)) {
      setDetailsState("failed");
      setDetailsError(result.payload ?? "Unable to save these details.");
      return;
    }

    setDetailsState("idle");
    setIsDetailsDone(true);
  }

  /**
   * Leaves the details unwritten. The session is already recorded, so this
   * discards nothing - it only closes the form.
   */
  function handleSkipDetails() {
    if (saveState === "failed") {
      // Nothing is in the database yet, so this is a retry without details
      // rather than a way past the error.
      saveSession({
        subject: completedSession.subject,
        topic: completedSession.topic,
        notes: "",
      });
      return;
    }

    setIsDetailsDone(true);
  }

  /** Closes the finished session and returns the card to its idle state. */
  function closeCompletedSession() {
    hasSavedRef.current = false;
    setCompletedSession(null);
    setSaveState("idle");
    setSaveError("");
    setSavedSessionId(null);
    setDetailsState("idle");
    setDetailsError("");
    setIsDetailsDone(false);
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
        detailsState={detailsState}
        detailsError={detailsError}
        isDetailsDone={isDetailsDone}
        onSave={handleSaveDetails}
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
          onPause={() => openPauseCoach()}
          onResume={() => dispatch(resumeTimer(Date.now()))}
          onReset={() => dispatch(resetTimer())}
          onFinish={() => openFinishCoach()}
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
