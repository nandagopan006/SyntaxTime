import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getTodayStatistics } from "../../services/studyService";

/*
  Today's SAVED study totals, as Django knows them.

  This is deliberately separate from timerSlice. The timer holds the session
  running right now in the browser; this holds what is already in the database.
  Home adds the two together to show a live total.

  It lives in Redux rather than in Home's own state because the compact popup
  will need the same number later, and the popup is not a child of Home.
*/

/** Loads today's saved study totals from the API. */
export const fetchTodayStatistics = createAsyncThunk(
  "statistics/fetchToday",
  async () => {
    return getTodayStatistics();
  }
);

const initialState = {
  todayFocusedMinutes: 0,
  todaySessionsCount: 0,
  dailyTargetMinutes: 0,
  isLoading: false,
  hasFailed: false,
};

const statisticsSlice = createSlice({
  name: "statistics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayStatistics.pending, (state) => {
        state.isLoading = true;
        state.hasFailed = false;
      })
      .addCase(fetchTodayStatistics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.todayFocusedMinutes = action.payload.today_focused_minutes;
        state.todaySessionsCount = action.payload.today_sessions_count;
        state.dailyTargetMinutes = action.payload.daily_target_minutes;
      })
      .addCase(fetchTodayStatistics.rejected, (state) => {
        state.isLoading = false;
        state.hasFailed = true;
      });
  },
});

export default statisticsSlice.reducer;

/**
 * Today's focused time, saved plus still running.
 *
 * This is the one place the live total is worked out, so Home, the popup and
 * Focus Mode can never disagree about it.
 */
export function selectLiveTodayFocusSeconds(state) {
  const savedSeconds = state.statistics.todayFocusedMinutes * 60;

  // Break time is not study time. When break mode arrives it will run through
  // the same timer, so the mode is checked here rather than later.
  const activeSeconds =
    state.timer.mode === "focus" ? state.timer.elapsedFocusSeconds : 0;

  return savedSeconds + activeSeconds;
}

/** The focused seconds contributed by the session running right now. */
export function selectActiveSessionSeconds(state) {
  return state.timer.mode === "focus" ? state.timer.elapsedFocusSeconds : 0;
}
