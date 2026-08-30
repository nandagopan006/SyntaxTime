import { useEffect, useState } from "react";

import EditSessionForm from "../components/history/EditSessionForm";
import HistoryEmptyState from "../components/history/HistoryEmptyState";
import HistoryFilters from "../components/history/HistoryFilters";
import MonthNavigator from "../components/history/MonthNavigator";
import MonthSummary from "../components/history/MonthSummary";
import SessionDetails from "../components/history/SessionDetails";
import StudySessionList from "../components/history/StudySessionList";
import Button from "../components/ui/Button";
import LoadingState from "../components/ui/LoadingState";
import PageHeader from "../components/ui/PageHeader";
import {
  getHistorySummary,
  getStudyHistory,
  getSubjectTotals,
} from "../services/studyService";
import {
  DEFAULT_FILTERS,
  buildHistoryParams,
  formatMonthLabel,
} from "../utils/historyFilters";

// Long enough that typing "Promises" is one request rather than eight.
const SEARCH_DEBOUNCE_MS = 300;

/*
  The study history: a personal learning record.

  This page holds its own state rather than a Redux slice. Nothing else in
  SyntaxTime needs the history list, the chosen filters or the open session, and
  putting page-local state in the store would only add indirection. The timer,
  auth and today's totals stay in Redux because several pages share them.
*/
function History() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [sessions, setSessions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  // Bumped by Try again, so the effect below runs a second time.
  const [reloadCount, setReloadCount] = useState(0);

  const [selectedSession, setSelectedSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  // Confirms an edit actually reached the database. The form closes on success,
  // so without this the only sign of a saved change was the change itself.
  const [savedMessage, setSavedMessage] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [summary, setSummary] = useState(null);
  // The first year the user has any history in, so the year picker offers
  // their own range rather than an arbitrary span of decades.
  const [earliestYear, setEarliestYear] = useState(null);

  // The search box updates on every keystroke, but the request waits until the
  // typing stops.
  useEffect(() => {
    const timeoutId = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // The filter dropdown lists what the user has actually studied. Sessions
  // saved without a subject cannot be filtered for, so they are left out.
  useEffect(() => {
    async function loadSubjects() {
      try {
        const totals = await getSubjectTotals();
        setSubjects(
          totals
            .filter((row) => row.subject)
            .map((row) => ({ value: row.subject, label: row.subject }))
        );
      } catch {
        // A missing dropdown is a small loss; the history itself still loads.
        setSubjects([]);
      }
    }


    loadSubjects();
  }, []);

  // Runs on first load and whenever the filters change - not on every render.
  useEffect(() => {
    // Guards against a slow earlier request landing after a newer one and
    // showing results for filters the user has already moved on from.
    let isCurrent = true;

    async function loadFirstPage() {
      setStatus("loading");
      setSelectedSession(null);
      setIsEditing(false);

      const params = buildHistoryParams(filters, search);

      try {
        // Both describe the same selection, so they are asked for together and
        // the totals can never belong to a different month than the list.
        const [data, monthSummary] = await Promise.all([
          getStudyHistory({ ...params, page: 1 }),
          getHistorySummary(params),
        ]);

        if (!isCurrent) {
          return;
        }

        setSessions(data.results);
        setTotalCount(data.count);
        setHasMore(Boolean(data.next));
        setSummary(monthSummary);
        if (monthSummary.archive_start_date) {
          setEarliestYear(Number(monthSummary.archive_start_date.slice(0, 4)));
        }
        setPage(1);
        setStatus("ready");
      } catch {
        if (isCurrent) {
          setStatus("failed");
        }
      }
    }

    loadFirstPage();

    return () => {
      isCurrent = false;
    };
  }, [filters, search, reloadCount]);

  /** Adds the next page of older sessions to the list already on screen. */
  async function handleLoadMore() {
    setIsLoadingMore(true);
    setLoadMoreFailed(false);

    try {
      const data = await getStudyHistory({
        ...buildHistoryParams(filters, search),
        page: page + 1,
      });

      setSessions((existing) => [...existing, ...data.results]);
      setHasMore(Boolean(data.next));
      setPage((current) => current + 1);
    } catch {
      // Keep the sessions already on screen, say what happened, and leave the
      // button in place so the user can try the same page again.
      setLoadMoreFailed(true);
    }

    setIsLoadingMore(false);
  }

  /**
   * Applies a change from the filter bar or the month navigator.
   *
   * Everything the archive shows is derived from this one object, so a change
   * here reloads the list and the totals together and they cannot disagree.
   * The page and the open session reset in the effect below, because a page
   * five of the previous month means nothing in this one.
   */
  function handleFiltersChange(change) {
    setFilters((current) => ({ ...current, ...change }));
  }

  /** Clears the search and subject, and stays in the month being viewed. */
  function handleResetFilters() {
    setFilters((current) => ({ ...current, subject: "" }));
    setSearchInput("");
    setSearch("");
  }

  /**
   * Puts an edited session back into the list and the detail panel.
   *
   * Updating the one row in place is enough, because it is the only thing that
   * changed, and it avoids refetching the page and losing the reading position.
   */
  function handleSessionSaved(updatedSession) {
    setSessions((existing) =>
      existing.map((session) =>
        session.id === updatedSession.id ? updatedSession : session
      )
    );
    setSelectedSession(updatedSession);
    setIsEditing(false);
    setSavedMessage("Session updated.");
  }

  // The month is not a filter: it is where the user is. Only search and
  // subject make an empty page something to clear rather than something to
  // navigate away from.
  const hasActiveFilters = search !== "" || filters.subject !== "";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Study history"
        description="Your learning record: what you studied, for how long, and what you took away from it."
      />

      <HistoryFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        subjects={subjects}
        onReset={handleResetFilters}
      />

      {/* The month leads: it is how the archive is navigated, and the totals
          under it say what that month amounted to before any single session
          is read. */}
      <div className="space-y-5 border-t border-rule pt-6">
        <MonthNavigator
          month={filters}
          earliestYear={earliestYear}
          onChange={(month) => handleFiltersChange(month)}
        />

        <MonthSummary summary={summary} isLoading={status === "loading"} />
      </div>

      <div className="grid gap-8 border-t border-rule pt-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        <div>
          {status === "loading" && (
            <LoadingState
              label={`Loading ${formatMonthLabel(filters)}`}
              lines={5}
            />
          )}

          {status === "failed" && (
            <div role="alert">
              <p className="text-sm text-burgundy">
                Unable to load study history for {formatMonthLabel(filters)}.
              </p>
              <Button
                variant="secondary"
                onClick={() => setReloadCount((count) => count + 1)}
                className="mt-3"
              >
                Try again
              </Button>
            </div>
          )}

          {status === "ready" && sessions.length === 0 && (
            <HistoryEmptyState
              monthLabel={formatMonthLabel(filters)}
              hasActiveFilters={hasActiveFilters}
              hasAnyHistory={earliestYear !== null}
              onResetFilters={handleResetFilters}
            />
          )}

          {status === "ready" && sessions.length > 0 && (
            <>
              <p className="mb-4 text-sm text-ink-faint tabular-nums">
                {sessions.length < totalCount
                  ? `Showing ${sessions.length} of ${totalCount} sessions`
                  : `${totalCount} ${totalCount === 1 ? "session" : "sessions"}`}
                {hasActiveFilters && " found"}
              </p>

              <StudySessionList
                sessions={sessions}
                selectedId={selectedSession?.id}
                onSelect={(session) => {
                  setSelectedSession(session);
                  setIsEditing(false);
                  setSavedMessage("");
                }}
              />

              {loadMoreFailed && (
                <p className="mt-4 text-sm text-burgundy" role="alert">
                  Could not load more sessions.
                </p>
              )}

              {hasMore && (
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  isBusy={isLoadingMore}
                  busyLabel="Loading..."
                  fullWidth
                  className="mt-6"
                >
                  Load older sessions
                </Button>
              )}
            </>
          )}
        </div>

        <aside
          aria-label="Session details"
          className="surface-card p-6 lg:sticky lg:top-0"
        >
          {!selectedSession ? (
            <p className="text-sm text-ink-faint">
              Choose a session to see the full record, or to fill in what you
              studied.
            </p>
          ) : isEditing ? (
            <EditSessionForm
              // Remounting on a different session throws away any half-typed
              // edit from the previous one, instead of carrying it across.
              key={selectedSession.id}
              session={selectedSession}
              onCancel={() => setIsEditing(false)}
              onSaved={handleSessionSaved}
            />
          ) : (
            <>
              {savedMessage && (
                <p className="mb-4 text-sm text-forest" role="status">
                  {savedMessage}
                </p>
              )}

              <SessionDetails
                session={selectedSession}
                onEdit={() => {
                  setSavedMessage("");
                  setIsEditing(true);
                }}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default History;
