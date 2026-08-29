import { useSelector } from "react-redux";

import {
  selectActiveSessionSeconds,
  selectLiveTodayFocusSeconds,
} from "../../features/statistics/statisticsSlice";
import { calculateProgressPercent, formatStudyTime } from "../../utils/formatTime";

/*
  Today's focused time, updating while a session runs.

  It only reads and displays. The timer owns the running session, the API owns
  the saved total, and the selector combines them.
*/
function TodayFocusStat() {
  const liveTodaySeconds = useSelector(selectLiveTodayFocusSeconds);
  const activeSessionSeconds = useSelector(selectActiveSessionSeconds);
  const { dailyTargetMinutes, todaySessionsCount, isLoading, hasFailed } =
    useSelector((state) => state.statistics);

  const progressPercent = calculateProgressPercent(
    liveTodaySeconds,
    dailyTargetMinutes
  );

  return (
    <section className="bg-surface border border-rule rounded-lg p-6">
      <h2 className="text-xs uppercase tracking-[0.15em] text-brass">Today</h2>

      <p className="mt-3 font-display text-4xl text-ink tabular-nums">
        {formatStudyTime(liveTodaySeconds)}
      </p>

      {hasFailed && (
        <p className="mt-2 text-sm text-burgundy">
          Could not load today&apos;s saved total. The time shown may be incomplete.
        </p>
      )}

      {isLoading && !hasFailed && (
        <p className="mt-2 text-sm text-ink-faint">Loading today&apos;s total...</p>
      )}

      {dailyTargetMinutes > 0 && (
        <div className="mt-5">
          <div className="flex justify-between text-sm text-ink-muted">
            <span>Target {formatStudyTime(dailyTargetMinutes * 60)}</span>
            <span className="tabular-nums">{progressPercent}%</span>
          </div>
          <div
            className="mt-2 h-2 rounded bg-surface-sunken overflow-hidden"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward today's study target"
          >
            <div
              className="h-full bg-brass"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <dl className="mt-6 space-y-1 text-sm border-t border-rule pt-4">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Sessions today</dt>
          <dd className="text-ink tabular-nums">{todaySessionsCount}</dd>
        </div>

        {activeSessionSeconds > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-muted">Current session</dt>
            <dd className="text-ink tabular-nums">
              {formatStudyTime(activeSessionSeconds)}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

export default TodayFocusStat;
