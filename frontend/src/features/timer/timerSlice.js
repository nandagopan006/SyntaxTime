import { createSlice } from "@reduxjs/toolkit";

import { saveStudySession } from "../statistics/statisticsSlice";

/*
  The one active timer.

  Home, the compact popup and Focus Mode all read this same state, so the views
  can never disagree about how much time is left.

  `mode` says what is being counted down. A focus session accrues study time and
  can be saved; a break is the same countdown with none of that meaning.

  Time is measured from a timestamp rather than by counting ticks. setInterval is
  not precise - a background browser tab can fire it far less often than once a
  second - so counting callbacks would slowly lose real study time.
*/
const initialState = {
  mode: "focus",
  durationSeconds: 0,
  remainingSeconds: 0,
  elapsedFocusSeconds: 0,
  isRunning: false,
  isPaused: false,
  isCompleted: false,
  // Subject and topic are optional in SyntaxTime. Empty strings are valid and a
  // session must be able to start without either of them.
  subject: "",
  topic: "",
  startedAt: null,
  // The moment the countdown is measured from, in milliseconds. On resume it is
  // pushed forward by however long the session was paused, so the difference
  // between now and this value is always the real focused time.
  runningSince: null,
  // How many times this session has been interrupted, counted from the moment
  // the user reaches for Pause rather than from the pause itself - somebody who
  // stops to think and then carries on was still interrupted.
  //
  // It belongs to the session and dies with it. It is context for the focus
  // coach's question, never a score: nothing in SyntaxTime reads it to judge
  // anybody, and it is never saved or sent anywhere but the coach.
  pauseCount: 0,
};

/** Recalculates elapsed and remaining time from the running-since timestamp. */
function applyElapsedTime(state, now) {
  if (state.runningSince === null) {
    return;
  }

  const elapsed = Math.floor((now - state.runningSince) / 1000);

  state.remainingSeconds = Math.max(state.durationSeconds - elapsed, 0);

  // A break counts down through this same reducer, but its seconds are not
  // study time. Guarding the write here is what keeps break minutes out of
  // today's total, rather than every view having to remember to exclude them.
  if (state.mode === "focus") {
    state.elapsedFocusSeconds = Math.min(elapsed, state.durationSeconds);
  }
}

const timerSlice = createSlice({
  name: "timer",
  initialState,
  reducers: {
    /**
     * Brings back a session that was running when the application closed.
     *
     * Restored paused, holding exactly the time the snapshot recorded. It is
     * deliberately not resumed: the application cannot know whether it was
     * closed for two minutes or overnight, and counting that gap as study time
     * would feed invented minutes into every total, streak and leaderboard.
     *
     * runningSince stays null, so nothing accrues until the user resumes and
     * the resume reducer sets the measuring point from the remaining time.
     */
    restoreTimer(state, action) {
      const snapshot = action.payload;

      state.mode = snapshot.mode;
      state.durationSeconds = snapshot.durationSeconds;
      state.remainingSeconds = snapshot.remainingSeconds;
      state.elapsedFocusSeconds = snapshot.elapsedFocusSeconds ?? 0;
      state.subject = snapshot.subject ?? "";
      state.topic = snapshot.topic ?? "";
      state.startedAt = snapshot.startedAt ?? null;
      state.isRunning = false;
      state.isPaused = true;
      state.isCompleted = false;
      state.runningSince = null;
      state.pauseCount = snapshot.pauseCount ?? 0;
    },

    /** Sets the chosen focus length and puts the countdown at its starting point. */
    setDuration(state, action) {
      state.durationSeconds = action.payload;
      state.remainingSeconds = action.payload;
    },

    setSubject(state, action) {
      state.subject = action.payload;
    },

    setTopic(state, action) {
      state.topic = action.payload;
    },

    /**
     * Switches the one timer over to a break.
     *
     * A break is a countdown and nothing more: it has no subject, no topic and
     * no start timestamp, because it will never become a StudySession.
     */
    startBreak(state, action) {
      const { durationSeconds, now } = action.payload;

      state.mode = "break";
      state.durationSeconds = durationSeconds;
      state.remainingSeconds = durationSeconds;
      state.elapsedFocusSeconds = 0;
      state.isRunning = true;
      state.isPaused = false;
      state.isCompleted = false;
      state.subject = "";
      state.topic = "";
      state.startedAt = null;
      state.runningSince = now;
      state.pauseCount = 0;
    },

    /**
     * Begins a session.
     * The caller passes the current time, because reading the clock inside a
     * reducer would make it impure and its result unpredictable.
     */
    startTimer(state, action) {
      const { startedAt, now } = action.payload;

      state.isRunning = true;
      state.isPaused = false;
      state.isCompleted = false;
      state.elapsedFocusSeconds = 0;
      state.remainingSeconds = state.durationSeconds;
      state.startedAt = startedAt;
      state.runningSince = now;
      state.pauseCount = 0;
    },

    /**
     * Records that the user has reached for Pause or Finish.
     *
     * Counted on the interruption rather than on the pause, because somebody
     * who stops, thinks, and decides to carry on was still interrupted - and
     * the coach's question should reflect that. Separate from pauseTimer so
     * that asking about a pause never causes one.
     */
    countInterruption(state) {
      state.pauseCount += 1;
    },

    /** Recalculates the countdown. Dispatched on a short interval while running. */
    tickTimer(state, action) {
      if (!state.isRunning) {
        return;
      }
      applyElapsedTime(state, action.payload);
    },

    /** Stops focused time from accruing. Remaining time is left where it is. */
    pauseTimer(state, action) {
      if (!state.isRunning) {
        return;
      }

      applyElapsedTime(state, action.payload);
      state.isRunning = false;
      state.isPaused = true;
      state.runningSince = null;
    },

    /** Continues from the same remaining time, ignoring the time spent paused. */
    resumeTimer(state, action) {
      // Only a paused timer can resume. Resuming an idle one would set it
      // running with no startedAt, and the session could then never be saved,
      // because the API needs a start time. The buttons never offer it, but the
      // state is what has to make it impossible.
      if (!state.isPaused || state.isCompleted) {
        return;
      }

      // Shift the measuring point forward by the pause, so the seconds spent
      // paused are never counted. The elapsed time is read back from the
      // countdown rather than from elapsedFocusSeconds, because a break leaves
      // that value at zero and would otherwise resume from the beginning.
      const elapsedSeconds = state.durationSeconds - state.remainingSeconds;
      state.runningSince = action.payload - elapsedSeconds * 1000;
      state.isRunning = true;
      state.isPaused = false;
    },

    /** Returns to the chosen duration. A reset never produces a saved session. */
    resetTimer(state) {
      state.remainingSeconds = state.durationSeconds;
      state.elapsedFocusSeconds = 0;
      state.isRunning = false;
      state.isPaused = false;
      state.isCompleted = false;
      state.startedAt = null;
      state.runningSince = null;
      state.pauseCount = 0;
    },

    /**
     * Ends the session, either early or on reaching zero.
     * elapsedFocusSeconds is deliberately kept, because the save step needs it.
     * Doing nothing when already completed is what stops the two completion
     * paths from both finishing the same session.
     */
    finishTimer(state, action) {
      if (state.isCompleted) {
        return;
      }

      applyElapsedTime(state, action.payload);
      state.isRunning = false;
      state.isPaused = false;
      state.isCompleted = true;
      state.runningSince = null;
    },

    /**
     * Wipes the timer back to its initial state, after a session is discarded,
     * or once a break is skipped or over. Because the initial mode is "focus",
     * this is also how a break ends.
     */
    clearTimer() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // A saved session clears itself here rather than through a separate
    // dispatch. The statistics slice takes the same action to add the session
    // to today's saved total, so the minutes leave the timer and arrive in the
    // total in one state change, and are never counted in both at once.
    builder.addCase(saveStudySession.fulfilled, () => initialState);
  },
});

export const {
  countInterruption,
  restoreTimer,
  setDuration,
  setSubject,
  setTopic,
  startBreak,
  startTimer,
  tickTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  finishTimer,
  clearTimer,
} = timerSlice.actions;

export default timerSlice.reducer;
