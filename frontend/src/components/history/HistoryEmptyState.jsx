import { Link } from "react-router-dom";

/*
  What History says when there is nothing to show.

  Two situations that look identical on screen but mean opposite things: a
  filter that happened to match nothing, and a user who has not studied yet.
  Telling someone "no sessions found" on their first day would read like the
  app had lost their work.
*/
function HistoryEmptyState({ hasActiveFilters, onResetFilters }) {
  if (hasActiveFilters) {
    return (
      <div>
        <p className="text-sm text-ink-muted">No sessions found.</p>
        <p className="mt-1 text-sm text-ink-faint">
          Try another subject or date range.
        </p>

        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 rounded border border-rule px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-muted">No study sessions yet.</p>
      <p className="mt-1 text-sm text-ink-faint">
        Start your first focus session to build your learning history.
      </p>

      <Link
        to="/"
        className="mt-4 inline-block rounded bg-ink px-5 py-2.5 text-sm text-parchment focus-visible:outline-2 focus-visible:outline-brass"
      >
        Start studying
      </Link>
    </div>
  );
}

export default HistoryEmptyState;
