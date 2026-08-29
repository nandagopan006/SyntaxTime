import { CalendarSearch, NotebookPen } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";

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
      <EmptyState
        icon={CalendarSearch}
        title="No sessions found."
        description="Try another subject or date range."
        action={
          <Button variant="secondary" onClick={onResetFilters}>
            Clear filters
          </Button>
        }
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
