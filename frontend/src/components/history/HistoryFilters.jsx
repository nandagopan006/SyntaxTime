import { Search } from "lucide-react";

import { DATE_RANGES } from "../../utils/historyFilters";

/*
  The search box and the subject and date filters.

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
  const isFiltered =
    searchInput !== "" || filters.subject !== "" || filters.dateRange !== "all";

  return (
    <section aria-label="Filter your history" className="space-y-4">
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
              className="w-full rounded border border-rule py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-brass"
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
            className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brass"
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

      <fieldset>
        <legend className="text-sm font-medium text-ink-muted">When</legend>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => onFiltersChange({ dateRange: range.value })}
              aria-pressed={filters.dateRange === range.value}
              className={[
                "rounded border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-brass",
                filters.dateRange === range.value
                  ? "border-brass bg-surface-sunken text-ink font-medium"
                  : "border-rule text-ink-muted hover:bg-surface-sunken/60 hover:text-ink",
              ].join(" ")}
            >
              {range.label}
            </button>
          ))}

          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="rounded px-3 py-1.5 text-sm text-brass hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brass"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Either end can be left blank, which reads as "everything before" or
            "everything since". */}
        {filters.dateRange === "custom" && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm text-ink-muted" htmlFor="history-start-date">
                From
              </label>
              <input
                id="history-start-date"
                type="date"
                value={filters.startDate}
                onChange={(event) => onFiltersChange({ startDate: event.target.value })}
                className="mt-1 rounded border border-rule px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-ink-muted" htmlFor="history-end-date">
                To
              </label>
              <input
                id="history-end-date"
                type="date"
                value={filters.endDate}
                onChange={(event) => onFiltersChange({ endDate: event.target.value })}
                className="mt-1 rounded border border-rule px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </fieldset>
    </section>
  );
}

export default HistoryFilters;
