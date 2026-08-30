import { Search } from "lucide-react";

/*
  The search box and the subject filter.

  When is answered by the month navigator, so this is only what and about what.
  It owns no state of its own: History holds the filters and passes them down,
  so there is one answer to "what is currently being shown" rather than two
  that can drift apart.
*/
function HistoryFilters({
  filters,
  onFiltersChange,
  searchInput,
  onSearchChange,
  subjects,
  onReset,
}) {
  const isFiltered = searchInput !== "" || filters.subject !== "";

  return (
    <section aria-label="Filter your history" className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <label className="block text-sm font-medium text-ink-muted" htmlFor="history-search">
            Search your notes
          </label>
          <div className="relative mt-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="history-search"
              type="search"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="JWT, Promises, useMemo..."
              className="field-control pl-9"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-muted" htmlFor="history-subject">
            Subject
          </label>
          <select
            id="history-subject"
            value={filters.subject}
            onChange={(event) => onFiltersChange({ subject: event.target.value })}
            className="field-control mt-1.5"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-md px-2 py-1 text-sm text-brass transition-colors hover:bg-brass-wash"
        >
          Clear filters
        </button>
      )}

    </section>
  );
}

export default HistoryFilters;
