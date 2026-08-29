import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { fetchRecentSessions } from "../../features/statistics/statisticsSlice";
import { formatSessionDate } from "../../utils/formatDate";
import { formatStudyMinutes } from "../../utils/formatTime";
import Button from "../ui/Button";
import DashboardSection from "./DashboardSection";

/*
  The newest completed sessions, just enough to recognise each one.

  Notes are deliberately left out. This list answers "what have I been working
  on?"; the full learning record belongs on the History page.
*/
function RecentSessions() {
  const dispatch = useDispatch();
  const { recentSessions, isRecentLoading, hasRecentFailed } = useSelector(
    (state) => state.statistics
  );

  const historyLink = (
    <Link
      to="/history"
      className="rounded-md px-2 py-1 text-sm text-brass transition-colors hover:bg-brass-wash"
    >
      All sessions
    </Link>
  );

  if (hasRecentFailed) {
    return (
      <DashboardSection title="Recent sessions">
        <p className="text-sm text-burgundy" role="alert">
          Unable to load your recent sessions.
        </p>
        <Button
          variant="secondary"
          onClick={() => dispatch(fetchRecentSessions())}
          className="mt-3"
        >
          Try again
        </Button>
      </DashboardSection>
    );
  }

  if (isRecentLoading && recentSessions.length === 0) {
    return (
      <DashboardSection title="Recent sessions">
        <p className="text-sm text-ink-faint">Loading recent sessions...</p>
      </DashboardSection>
    );
  }

  if (recentSessions.length === 0) {
    return (
      <DashboardSection title="Recent sessions">
        <p className="text-sm text-ink-muted">
          No study sessions yet. Your first one will show up here.
        </p>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Recent sessions" action={historyLink}>
      <ul className="divide-y divide-rule">
        {recentSessions.map((session) => (
          <li
            key={session.id}
            className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              {/* Subject and topic are optional, so each falls back to wording
                  that reads as a real answer rather than a missing value. */}
              <p className="truncate text-sm text-ink">
                {session.subject || "General Study"}
              </p>
              <p className="truncate text-sm text-ink-faint">
                {session.topic || "No topic added"}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm text-ink tabular-nums">
                {formatStudyMinutes(session.focused_minutes)}
              </p>
              <p className="text-sm text-ink-faint">
                {formatSessionDate(session.started_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}

export default RecentSessions;
