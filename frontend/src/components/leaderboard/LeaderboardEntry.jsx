import { formatStudyMinutes } from "../../utils/formatTime";

/**
 * Returns the styling for a rank badge.
 *
 * The top three are marked, but quietly and within the same warm palette. This
 * is a study room noticeboard, not a game.
 */
function getRankStyle(rank) {
  if (rank === 1) {
    return "border-brass bg-brass text-parchment shadow-card";
  }
  if (rank === 2) {
    return "border-brass-soft bg-brass-wash text-ink";
  }
  if (rank === 3) {
    return "border-rule-strong bg-surface-sunken text-ink-muted";
  }
  return "border-transparent bg-transparent text-ink-faint";
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
        "flex items-center gap-4 rounded-md border px-4 py-3 transition-colors",
        entry.is_current_user
          ? "border-brass bg-brass-wash"
          : "border-rule bg-surface-raised hover:border-rule-strong",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums",
          getRankStyle(entry.rank),
        ].join(" ")}
      >
        {String(entry.rank).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-ink">
          <span className="sr-only">Rank {entry.rank}: </span>
          {entry.username}
        </p>

        {entry.is_current_user && (
          <p className="section-eyebrow">You</p>
        )}
      </div>

      <span className="shrink-0 text-sm text-ink tabular-nums font-display">
        {formatStudyMinutes(entry.focused_minutes)}
      </span>
    </li>
  );
}

export default LeaderboardEntry;
