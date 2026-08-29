import { formatStudyMinutes } from "../../utils/formatTime";

/**
 * Returns the styling for a rank badge.
 *
 * The top three are marked, but quietly and within the same warm palette. This
 * is a study room noticeboard, not a game.
 */
function getRankStyle(rank) {
  if (rank === 1) {
    return "border-brass bg-brass text-parchment";
  }
  if (rank === 2) {
    return "border-brass-soft bg-surface-sunken text-ink";
  }
  if (rank === 3) {
    return "border-rule bg-surface-sunken text-ink-muted";
  }
  return "border-transparent text-ink-faint";
}

/*
  One person on the leaderboard.

  The rank is always written as a number and the current user is always named
  in words, so the row can be read without seeing any of the colours.
*/
function LeaderboardEntry({ entry }) {
  return (
    <li
      className={[
        "flex items-center gap-4 rounded border px-4 py-3",
        entry.is_current_user
          ? "border-brass bg-surface-sunken"
          : "border-rule bg-surface",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm tabular-nums",
          getRankStyle(entry.rank),
        ].join(" ")}
      >
        {entry.rank}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg text-ink">
          <span className="sr-only">Rank {entry.rank}: </span>
          {entry.username}
        </p>

        {entry.is_current_user && (
          <p className="text-xs uppercase tracking-[0.15em] text-brass">You</p>
        )}
      </div>

      <span className="shrink-0 text-sm text-ink tabular-nums">
        {formatStudyMinutes(entry.focused_minutes)}
      </span>
    </li>
  );
}

export default LeaderboardEntry;
