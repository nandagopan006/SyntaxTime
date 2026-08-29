import { useSelector } from "react-redux";

import {
  selectActiveSessionSeconds,
  selectLiveTodayFocusSeconds,
} from "../../features/statistics/statisticsSlice";
import { formatStudyMinutes, formatStudyTime } from "../../utils/formatTime";
import DailyTargetProgress from "./DailyTargetProgress";

/** One label-and-value row in the panel's list of figures. */
function StatRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/*
  Today's focused time, updating while a session runs.

  It only reads and displays. The timer owns the running session, the API owns
  the saved totals, and selectLiveTodayFocusSeconds is the single place the two
  are added together.
*/
function TodayFocusStat() {
  const liveTodaySeconds = useSelector(selectLiveTodayFocusSeconds);
  const activeSessionSeconds = useSelector(selectActiveSessionSeconds);
  const {
    todaySessionsCount,
    currentStreakDays,
    averageSessionMinutes,
    isLoading,
    hasFailed,
  } = useSelector((state) => state.statistics);

  return (
    <section
      aria-labelledby="today-heading"
      className="bg-surface border border-rule rounded-lg p-6"
    >
      <h2
        id="today-heading"
        className="text-xs uppercase tracking-[0.15em] text-brass"
      >
        Today
      </h2>

      <p className="mt-3 font-display text-4xl text-ink tabular-nums">
        {formatStudyTime(liveTodaySeconds)}
      </p>

      {hasFailed && (
        <p className="mt-2 text-sm text-burgundy" role="alert">
          Could not load today&apos;s saved total. The time shown may be incomplete.
        </p>
      )}

      {isLoading && !hasFailed && (
        <p className="mt-2 text-sm text-ink-faint">Loading today&apos;s total...</p>
      )}

      <DailyTargetProgress focusedSeconds={liveTodaySeconds} />

      <dl className="mt-5 space-y-1 text-sm border-t border-rule pt-4">
        <StatRow label="Sessions today" value={todaySessionsCount} />

        {/* Shown only while studying, so the user can see why the total above
            is climbing. */}
        {activeSessionSeconds > 0 && (
          <StatRow
            label="Current session"
            value={formatStudyTime(activeSessionSeconds)}
          />
        )}

        <StatRow
          label="Current streak"
          value={
            currentStreakDays > 0
              ? `${currentStreakDays} ${currentStreakDays === 1 ? "day" : "days"}`
              : "—"
          }
        />

        <StatRow
          label="Average session"
          value={
            averageSessionMinutes > 0
              ? formatStudyMinutes(averageSessionMinutes)
              : "—"
          }
        />
      </dl>
    </section>
  );
}

export default TodayFocusStat;
