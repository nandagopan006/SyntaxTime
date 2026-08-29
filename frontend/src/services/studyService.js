import api from "./api";

/** Saves one completed SyntaxTime study session. */
export async function createStudySession(sessionData) {
  const response = await api.post("/study/sessions/", sessionData);
  return response.data;
}

/**
 * Returns today's saved study totals, plus the streak, average session length
 * and today's subject split that the Home dashboard shows alongside them.
 */
export async function getTodayStatistics() {
  const response = await api.get("/study/statistics/");
  return response.data;
}

/** Returns focused minutes for each day of the current week, Monday to Sunday. */
export async function getWeeklyStatistics() {
  const response = await api.get("/study/statistics/weekly/");
  return response.data;
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
  return response.data;
}

/** Sets today's study target, in minutes. */
export async function updateTodayGoal(targetMinutes) {
  const response = await api.put("/goals/today/", {
    target_minutes: targetMinutes,
  });
  return response.data;
}
