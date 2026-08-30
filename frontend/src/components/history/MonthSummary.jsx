import { formatStudyMinutes } from "../../utils/formatTime";

/*
  What a month of study amounted to, read before any of the individual sessions.

  Three figures and no chart: this is the heading of an archive, not a second
  dashboard. Home is where study is measured; here it only says what is in the
  drawer being opened.
*/

/**
 * Shows the totals for the month currently being viewed.
 *
 * The figures come from the server and cover the whole month, not just the
 * sessions fetched so far, so they stay right while more are loaded in.
 */
function MonthSummary({ summary, isLoading }) {
  const figures = [
    {
      label: "Focused",
      value: formatStudyMinutes(summary?.focused_minutes ?? 0),
    },
    {
      label: "Sessions",
      value: summary?.sessions_count ?? 0,
    },
    {
      // Three sessions in one evening are one study day.
      label: "Study days",
      value: summary?.study_days ?? 0,
    },
  ];

  return (
    <dl
      aria-label="Totals for this month"
      aria-busy={isLoading || undefined}
      className={`flex flex-wrap gap-x-10 gap-y-3 ${isLoading ? "opacity-50" : ""}`}
    >
      {figures.map((figure) => (
        <div key={figure.label}>
          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            {figure.label}
          </dt>
          <dd className="mt-1 text-2xl text-ink tabular-nums font-display">
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default MonthSummary;
