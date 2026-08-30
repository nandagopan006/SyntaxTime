import api from "./api";

/*
  The signed-in user's overall study history.

  One request, already totalled by Django. The browser never receives the
  sessions themselves, so nothing here has to add anything up, and a profile
  with two thousand sessions costs exactly as much as one with three.
*/

/**
 * Fetches the authenticated user's overall study statistics.
 *
 * Every field is given a value even if the response leaves it out, so an older
 * backend costs the page one figure rather than the whole overview.
 */
export async function getProfileStatistics() {
  const response = await api.get("/study/profile/");
  const data = response.data ?? {};

  return {
    totalFocusedMinutes: data.total_focused_minutes ?? 0,
    totalSessions: data.total_sessions ?? 0,
    currentStreakDays: data.current_streak_days ?? 0,
    longestStreakDays: data.longest_streak_days ?? 0,
    averageSessionMinutes: data.average_session_minutes ?? 0,
    totalStudyDays: data.total_study_days ?? 0,
    mostStudiedSubject: data.most_studied_subject ?? "",
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
  };
}
