import api from "./api";

/*
  The friend study leaderboard.

  Django works out the ranking and sends back finished rows, so nothing here
  adds anything up. That keeps one definition of "who is ahead", and means the
  browser never receives another person's study sessions just to total them.
*/

/**
 * Fills in anything a response leaves out, so a half-answered request costs
 * the leaderboard one section rather than taking the page down with it.
 */
function readLeaderboard(data) {
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  return {
    period: data?.period ?? "",
    startDate: data?.start_date ?? null,
    endDate: data?.end_date ?? null,
    entries,
  };
}

/** Fetches the current user's leaderboard for the current Monday-to-Sunday week. */
export async function getWeeklyLeaderboard() {
  const response = await api.get("/leaderboard/weekly/");
  return readLeaderboard(response.data);
}

/** Fetches the current user's leaderboard for the current calendar month. */
export async function getMonthlyLeaderboard() {
  const response = await api.get("/leaderboard/monthly/");
  return readLeaderboard(response.data);
}
