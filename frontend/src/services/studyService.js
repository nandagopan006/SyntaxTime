import api from "./api";

/** Saves one completed SyntaxTime study session. */
export async function createStudySession(sessionData) {
  const response = await api.post("/study/sessions/", sessionData);
  return response.data;
}

/** Returns the saved study totals for today. */
export async function getTodayStatistics() {
  const response = await api.get("/study/statistics/");
  return response.data;
}
