import { CalendarOff, CalendarSearch, NotebookPen } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";

/*
  What History says when there is nothing to show.

  Three situations that look identical on screen but mean quite different
  things: a filter that happened to match nothing, a quiet month in an archive
  that is otherwise full, and a user who has not studied yet. Telling someone
  "no sessions found" on their first day would read like the app had lost
  their work.
*/
function HistoryEmptyState({
  monthLabel,
  hasActiveFilters,
  hasAnyHistory,
  onResetFilters,
}) {
  if (hasActiveFilters) {
    return (
      <EmptyState
        icon={CalendarSearch}
        title="No sessions found."
        description={`Nothing in ${monthLabel} matches. Try another subject, search or month.`}
        action={
          <Button variant="secondary" onClick={onResetFilters}>
            Clear filters
          </Button>
        }
      />
    );
  }

  // An empty month is not an empty archive. Somebody looking back at a month
  // they did not study in should be told that, not that they have never
  // studied at all.
  if (hasAnyHistory) {
    return (
      <EmptyState
        icon={CalendarOff}
        title={`No study sessions in ${monthLabel}.`}
        description="Use the arrows above to look at another month."
      />
    );
  }

  return (
    <EmptyState
      icon={NotebookPen}
      title="No study sessions yet."
      description="Start your first focus session to build your learning history."
      action={
        <Link
          to="/"
          className="inline-flex items-center rounded-md border border-ink bg-ink px-4 py-2 text-sm font-medium text-parchment transition-colors hover:bg-ink/90"
        >
          Start studying
        </Link>
      }
    />
  );
}

export default HistoryEmptyState;
