import { formatStudyMinutes } from "../../utils/formatTime";

/** Formats a run of days: "12 days", "1 day", or "0 days" before any studying. */
function formatDays(days) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** One figure and what it means. */
function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.15em] text-brass">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/*
  The five figures that describe a study habit.

  A plain row of numbers rather than five coloured cards: they are all the same
  kind of thing, and boxing each one separately would suggest otherwise.

  Every value is lifetime and comes from saved sessions. A session running right
  now is not in any of these until it is finished and saved.
*/
function ProfileStats({ statistics }) {
  return (
    <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
      <Stat label="Sessions" value={statistics.totalSessions} />

      <Stat label="Study days" value={statistics.totalStudyDays} />

      <Stat
        label="Current streak"
        value={formatDays(statistics.currentStreakDays)}
      />

      <Stat
        label="Longest streak"
        value={formatDays(statistics.longestStreakDays)}
      />

      {/* A dash rather than "0m": with no sessions there is no average yet,
          which is a different thing from an average of nothing. */}
      <Stat
        label="Average session"
        value={
          statistics.totalSessions === 0
            ? "—"
            : formatStudyMinutes(statistics.averageSessionMinutes)
        }
      />
    </dl>
  );
}

export default ProfileStats;
