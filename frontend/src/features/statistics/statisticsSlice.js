import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getErrorMessage } from "../../services/api";
import {
  createStudySession,
  getRecentSessions,
  getTodayStatistics,
  getWeeklyStatistics,
  updateStudySession,
} from "../../services/studyService";

/*
  Everything the Home dashboard knows from the database.

  This is deliberately separate from timerSlice. The timer holds the session
  running right now in the browser; this holds what has already been saved.
  The selectors at the bottom are the one place the two are added together.

  It lives in Redux rather than in Home's own state because the compact popup
  and Focus Mode need today's total as well, and neither is a child of Home.
*/

/** Loads today's saved totals, the streak, the average session and today's subjects. */
export const fetchTodayStatistics = createAsyncThunk(
  "statistics/fetchToday",
  async () => {
    return getTodayStatistics();
  }
);

/** Loads focused minutes for each day of the current week. */
export const fetchWeeklyStatistics = createAsyncThunk(
  "statistics/fetchWeekly",
  async () => {
    return getWeeklyStatistics();
  }
);

/** Loads the newest completed sessions shown in the dashboard's recent list. */
export const fetchRecentSessions = createAsyncThunk(
  "statistics/fetchRecentSessions",
  async () => {
    return getRecentSessions();
  }
);

/**
 * Saves a finished study session and reads today's totals back in one step.
 *
 * Both slices react to this one action: the totals below take in the new
 * session, and timerSlice clears the finished one. Doing it in a single action
 * is what stops the session's minutes from ever appearing in the saved total
 * and in the running timer at the same time, which would briefly show a user
 * who studied 30 minutes on top of 2 hours a total of 3 hours instead of 2h 30m.
 */
export const saveStudySession = createAsyncThunk(
  "statistics/saveStudySession",
  async (sessionPayload, { dispatch, rejectWithValue }) => {
    let session;

    try {
      session = await createStudySession(sessionPayload);
    } catch (error) {
      // Only this request failing means the session was not recorded, so the
      // user is offered a retry and the timer is left exactly as it was.
      return rejectWithValue(
        getErrorMessage(error, "Unable to save this session.")
      );
    }

    // The saved session comes back with the rest, because a session now
    // records itself the moment it ends and any details the user writes
    // afterwards are an edit of this row. Without its id there would be
    // nothing to attach them to.
    try {
      return { session, statistics: await getTodayStatistics() };
    } catch {
      // The session is in the database either way, so a failure here must not
      // report the save as failed. Ask for the totals separately; until they
      // arrive the panel shows the last figures it confirmed rather than a
      // total that counts this session twice.
      dispatch(fetchTodayStatistics());
      return { session, statistics: null };
    }
  }
);

/**
 * Adds the optional details to a session that is already in the database.
 *
 * A session saves itself the moment it ends, so by the time the user has
 * finished writing there is a row to update rather than one to create. Subject
 * and topic change today's subject split, so the totals are re-read afterwards.
 */
export const updateSessionDetails = createAsyncThunk(
  "statistics/updateSessionDetails",
  async ({ id, details }, { dispatch, rejectWithValue }) => {
    try {
      await updateStudySession(id, details);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to save these details.")
      );
    }

    dispatch(fetchTodayStatistics());
    dispatch(fetchRecentSessions());
    return true;
  }
);

/**
 * Copies an API statistics response into the slice.
 *
 * Missing values fall back to the empty version of themselves. The components
 * below read state.subjects.length directly, so storing undefined here would
 * throw during render, and a throw during render blanks the whole page.
 */
function applyTodayStatistics(state, statistics) {
  state.todayFocusedMinutes = statistics.today_focused_minutes ?? 0;
  state.todaySessionsCount = statistics.today_sessions_count ?? 0;
  state.dailyTargetMinutes = statistics.daily_target_minutes ?? 0;
  state.currentStreakDays = statistics.current_streak_days ?? 0;
  state.averageSessionMinutes = statistics.average_session_minutes ?? 0;
  state.subjects = Array.isArray(statistics.subjects) ? statistics.subjects : [];
}

const initialState = {
  // Today, and the overall figures that sit beside it.
  todayFocusedMinutes: 0,
  todaySessionsCount: 0,
  dailyTargetMinutes: 0,
  currentStreakDays: 0,
  averageSessionMinutes: 0,
  subjects: [],
  isLoading: false,
  hasFailed: false,

  // The three dashboard sections load independently, so a slow chart never
  // blocks the rest of the page and one failure never blanks the dashboard.
  weeklyDays: [],
  isWeeklyLoading: false,
  hasWeeklyFailed: false,

  recentSessions: [],
  isRecentLoading: false,
  hasRecentFailed: false,
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
        applyTodayStatistics(state, action.payload);
      })
      .addCase(fetchTodayStatistics.rejected, (state) => {
        state.isLoading = false;
        state.hasFailed = true;
      })

      .addCase(saveStudySession.fulfilled, (state, action) => {
        // Null statistics mean the save succeeded but the totals could not be
        // re-read. The session itself is in the database either way.
        if (action.payload?.statistics) {
          applyTodayStatistics(state, action.payload.statistics);
        }
      })

      .addCase(fetchWeeklyStatistics.pending, (state) => {
        state.isWeeklyLoading = true;
        state.hasWeeklyFailed = false;
      })
      .addCase(fetchWeeklyStatistics.fulfilled, (state, action) => {
        state.isWeeklyLoading = false;
        state.weeklyDays = Array.isArray(action.payload?.days)
          ? action.payload.days
          : [];
      })
      .addCase(fetchWeeklyStatistics.rejected, (state) => {
        state.isWeeklyLoading = false;
        state.hasWeeklyFailed = true;
      })

      .addCase(fetchRecentSessions.pending, (state) => {
        state.isRecentLoading = true;
        state.hasRecentFailed = false;
      })
      .addCase(fetchRecentSessions.fulfilled, (state, action) => {
        state.isRecentLoading = false;
        state.recentSessions = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchRecentSessions.rejected, (state) => {
        state.isRecentLoading = false;
        state.hasRecentFailed = true;
      });
  },
});

export default statisticsSlice.reducer;

/**
 * Today's focused time, saved plus still running.
 *
 * This is the one place the live total is worked out, so Home, the popup and
 * Focus Mode can never disagree about it. Once a session is saved the API
 * total includes it and the timer is cleared, so the same minutes are counted
 * on exactly one side of this sum at any moment.
 */
export function selectLiveTodayFocusSeconds(state) {
  const savedSeconds = state.statistics.todayFocusedMinutes * 60;

  // Break time is not study time, so only a focus session contributes.
  const activeSeconds =
    state.timer.mode === "focus" ? state.timer.elapsedFocusSeconds : 0;

  return savedSeconds + activeSeconds;
}

/** The focused seconds contributed by the session running right now. */
export function selectActiveSessionSeconds(state) {
  return state.timer.mode === "focus" ? state.timer.elapsedFocusSeconds : 0;
}

/**
 * The whole minutes the running session has contributed so far.
 *
 * The weekly chart adds this to today's bar. It returns a plain number rather
 * than a rebuilt list so the chart only redraws when the minute changes, not
 * four times a second with every tick of the timer.
 */
export function selectActiveSessionMinutes(state) {
  return Math.floor(selectActiveSessionSeconds(state) / 60);
}
