import { createSlice } from "@reduxjs/toolkit";

/*
  The one active focus session.

  Home, and later the compact popup and Focus Mode, all read this same state, so
  the views can never disagree about how much time is left.

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
};

/** Recalculates elapsed and remaining time from the running-since timestamp. */
function applyElapsedTime(state, now) {
  if (state.runningSince === null) {
    return;
  }

  const elapsed = Math.floor((now - state.runningSince) / 1000);

  state.elapsedFocusSeconds = Math.min(elapsed, state.durationSeconds);
  state.remainingSeconds = Math.max(state.durationSeconds - elapsed, 0);
}

const timerSlice = createSlice({
  name: "timer",
  initialState,
  reducers: {
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

    setMode(state, action) {
      state.mode = action.payload;
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
      if (state.isCompleted) {
        return;
      }

      // Shift the measuring point forward by the pause, so the seconds spent
      // paused never count as focused time.
      state.runningSince = action.payload - state.elapsedFocusSeconds * 1000;
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

    /** Wipes the timer back to its initial state, after a session is saved or discarded. */
    clearTimer() {
      return initialState;
    },
  },
});

export const {
  setDuration,
  setSubject,
  setTopic,
  setMode,
  startTimer,
  tickTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  finishTimer,
  clearTimer,
} = timerSlice.actions;

export default timerSlice.reducer;
