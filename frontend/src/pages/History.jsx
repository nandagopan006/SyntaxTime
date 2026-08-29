import { useEffect, useState } from "react";

import EditSessionForm from "../components/history/EditSessionForm";
import HistoryEmptyState from "../components/history/HistoryEmptyState";
import HistoryFilters from "../components/history/HistoryFilters";
import SessionDetails from "../components/history/SessionDetails";
import StudySessionList from "../components/history/StudySessionList";
import { getStudyHistory, getSubjectTotals } from "../services/studyService";
import { DEFAULT_FILTERS, buildHistoryParams } from "../utils/historyFilters";

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

      try {
        const data = await getStudyHistory({
          ...buildHistoryParams(filters, search),
          page: 1,
        });

        if (!isCurrent) {
          return;
        }

        setSessions(data.results);
        setTotalCount(data.count);
        setHasMore(Boolean(data.next));
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

  /** Applies a change from the filter bar, leaving the other filters alone. */
  function handleFiltersChange(change) {
    setFilters((current) => ({ ...current, ...change }));
  }

  function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
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

  const hasActiveFilters =
    search !== "" || filters.subject !== "" || filters.dateRange !== "all";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-ink">Study history</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your learning record: what you studied, for how long, and what you
          took away from it.
        </p>
      </header>

      <HistoryFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        subjects={subjects}
        onReset={handleResetFilters}
      />

      <div className="grid gap-8 border-t border-rule pt-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
        <div>
          {status === "loading" && (
            <p className="text-sm text-ink-faint">Loading your study history...</p>
          )}

          {status === "failed" && (
            <div role="alert">
              <p className="text-sm text-burgundy">
                Unable to load your study history.
              </p>
              <button
                type="button"
                onClick={() => setReloadCount((count) => count + 1)}
                className="mt-3 rounded border border-rule px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
              >
                Try again
              </button>
            </div>
          )}

          {status === "ready" && sessions.length === 0 && (
            <HistoryEmptyState
              hasActiveFilters={hasActiveFilters}
              onResetFilters={handleResetFilters}
            />
          )}

          {status === "ready" && sessions.length > 0 && (
            <>
              <p className="mb-4 text-sm text-ink-faint tabular-nums">
                {totalCount} {totalCount === 1 ? "session" : "sessions"}
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
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="mt-6 w-full rounded border border-rule px-4 py-2.5 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brass"
                >
                  {isLoadingMore ? "Loading..." : "Load older sessions"}
                </button>
              )}
            </>
          )}
        </div>

        <aside
          aria-label="Session details"
          className="rounded-lg border border-rule bg-surface p-6 lg:sticky lg:top-6"
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
