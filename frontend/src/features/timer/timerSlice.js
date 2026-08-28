import { createSlice } from "@reduxjs/toolkit";

/*
  The one active focus session.

  Home, the compact popup and Focus Mode will all read this same state, so the
  three views can never disagree about how much time is left.

  This slice only describes state transitions. The countdown itself will run in
  React later, because a reducer must stay pure.
*/
const initialState = {
  mode: "focus",
  durationSeconds: 0,
  remainingSeconds: 0,
  elapsedFocusSeconds: 0,
  isRunning: false,
  isPaused: false,
  // Subject and topic are optional in SyntaxTime. Empty strings are valid and
  // a session must be able to start without either of them.
  subject: "",
  topic: "",
  startedAt: null,
};

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

    setRemainingSeconds(state, action) {
      state.remainingSeconds = action.payload;
    },

    setElapsedFocusSeconds(state, action) {
      state.elapsedFocusSeconds = action.payload;
    },

    /**
     * Begins a session.
     * The caller passes the start time, because reading the clock inside a
     * reducer would make it impure and its result unpredictable.
     */
    startTimer(state, action) {
      state.isRunning = true;
      state.isPaused = false;
      state.elapsedFocusSeconds = 0;
      state.startedAt = action.payload ?? null;
    },

    /** Stops focused time from accruing. Remaining time is left untouched. */
    pauseTimer(state) {
      state.isRunning = false;
      state.isPaused = true;
    },

    resumeTimer(state) {
      state.isRunning = true;
      state.isPaused = false;
    },

    /** Returns to the chosen duration. A reset never produces a saved session. */
    resetTimer(state) {
      state.remainingSeconds = state.durationSeconds;
      state.elapsedFocusSeconds = 0;
      state.isRunning = false;
      state.isPaused = false;
      state.startedAt = null;
    },

    /**
     * Ends the session early or on reaching zero.
     * elapsedFocusSeconds is deliberately kept, because the save step needs it.
     */
    finishTimer(state) {
      state.isRunning = false;
      state.isPaused = false;
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
  setRemainingSeconds,
  setElapsedFocusSeconds,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  finishTimer,
  clearTimer,
} = timerSlice.actions;

export default timerSlice.reducer;
