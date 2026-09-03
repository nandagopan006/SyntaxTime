import api from "./api";

/** Saves one completed SyntaxTime study session. */
export async function createStudySession(sessionData) {
  const response = await api.post("/study/sessions/", sessionData);
  return response.data;
}

/**
 * Returns today's saved study totals, plus the streak, average session length
 * and today's subject split that the Home dashboard shows alongside them.
 *
 * Every field is given a value here even if the response leaves it out. An
 * older or half-deployed backend answering without "subjects" should cost the
 * dashboard one card, not take the whole application down.
 */
export async function getTodayStatistics() {
  const response = await api.get("/study/statistics/");
  const data = response.data ?? {};

  return {
    today_focused_minutes: data.today_focused_minutes ?? 0,
    today_sessions_count: data.today_sessions_count ?? 0,
    daily_target_minutes: data.daily_target_minutes ?? 0,
    current_streak_days: data.current_streak_days ?? 0,
    average_session_minutes: data.average_session_minutes ?? 0,
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
  };
}

/**
 * Returns focused minutes for each day between two dates, inclusive.
 *
 * Counted by the API rather than from the sessions on screen: history arrives
 * a page at a time, so adding up what the browser holds would chart the first
 * twenty sessions and label it the month.
 */
export async function getDailyStatistics({ start_date, end_date }) {
  const response = await api.get("/study/statistics/daily/", {
    params: { start_date, end_date },
  });

  const days = response.data?.days;
  return Array.isArray(days) ? days : [];
}

/** Returns focused minutes for each day of the current week, Monday to Sunday. */
export async function getWeeklyStatistics() {
  const response = await api.get("/study/statistics/weekly/");
  const days = response.data?.days;

  return { days: Array.isArray(days) ? days : [] };
}

/**
 * Returns the newest completed sessions, for the dashboard's recent list.
 * The limit is applied by the API, so a long history is never downloaded to
 * show a handful of rows.
 */
export async function getRecentSessions(limit = 5) {
  const response = await api.get("/study/sessions/", {
    params: { status: "completed", limit },
  });

  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Returns the totals for whatever slice of history the parameters describe:
 * focused minutes, how many sessions, and how many separate study days.
 *
 * Takes the same parameters as getStudyHistory, so the figures always cover
 * the whole selection rather than the page of it currently on screen.
 */
export async function getHistorySummary(params) {
  const response = await api.get("/study/history/summary/", { params });
  const data = response.data ?? {};

  return {
    focused_minutes: data.focused_minutes ?? 0,
    sessions_count: data.sessions_count ?? 0,
    study_days: data.study_days ?? 0,
    // The whole archive, not this selection: how far back the record goes.
    archive_start_date: data.archive_start_date ?? null,
  };
}

/** Sets today's study target, in minutes. */
export async function updateTodayGoal(targetMinutes) {
  const response = await api.put("/goals/today/", {
    target_minutes: targetMinutes,
  });
  return response.data;
}

/**
 * Returns one page of the user's completed study history.
 *
 * The filters the History page builds - subject, date range and search - are
 * passed straight through as query parameters, so the database does the
 * filtering rather than the browser downloading everything and sifting it.
 */
export async function getStudyHistory(params = {}) {
  const response = await api.get("/study/history/", { params });
  const data = response.data ?? {};

  // A paginated response is expected. An unpaginated one - an array - is still
  // read correctly rather than leaving the page with no results to render.
  const results = Array.isArray(data) ? data : data.results;

  return {
    results: Array.isArray(results) ? results : [],
    count: data.count ?? (Array.isArray(results) ? results.length : 0),
    next: data.next ?? null,
  };
}

/**
 * Updates the optional details of a session that has already been recorded.
 *
 * Only subject, topic and notes can be sent: how long the session ran and when
 * it happened are measurements, and the API rejects attempts to change them.
 */
export async function updateStudySession(id, details) {
  const response = await api.patch(`/study/sessions/${id}/`, details);
  return response.data;
}

/** Returns every subject the user has studied, for the History filter. */
export async function getSubjectTotals() {
  const response = await api.get("/study/subjects/");

  return Array.isArray(response.data) ? response.data : [];
}
