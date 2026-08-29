import { Search } from "lucide-react";

import SearchResult from "./SearchResult";

/*
  The search box and whatever it found.

  It owns no state: Friends holds the query and the results, because sending a
  request from here has to update the requests list over there too.
*/
function UserSearch({
  query,
  onQueryChange,
  results,
  status,
  errorMessage,
  pendingUserId,
  onSendRequest,
}) {
  return (
    <section aria-labelledby="search-heading">
      <h2 id="search-heading" className="text-xs uppercase tracking-[0.15em] text-brass">
        Find people
      </h2>

      <div className="relative mt-3">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <label className="sr-only" htmlFor="user-search">
          Search SyntaxTime users by username
        </label>
        <input
          id="user-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search username..."
          className="w-full rounded border border-rule bg-surface py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-brass"
        />
      </div>

      <div className="mt-4">
        {status === "searching" && (
          <p className="text-sm text-ink-faint">Searching...</p>
        )}

        {status === "failed" && (
          <p className="text-sm text-burgundy" role="alert">
            {errorMessage}
          </p>
        )}

        {status === "ready" && results.length === 0 && (
          <p className="text-sm text-ink-muted">No users found.</p>
        )}

        {status === "ready" && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((user) => (
              <SearchResult
                key={user.id}
                user={user}
                isSending={pendingUserId === user.id}
                onSendRequest={onSendRequest}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default UserSearch;
