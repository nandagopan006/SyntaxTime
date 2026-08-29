import FriendItem from "./FriendItem";

/* The people the signed-in user studies alongside. */
function FriendsList({
  friends,
  status,
  errorMessage,
  removingFriendId,
  onRemove,
  onRetry,
}) {
  return (
    <section aria-labelledby="friends-heading">
      <h2
        id="friends-heading"
        className="text-xs uppercase tracking-[0.15em] text-brass"
      >
        Your friends
      </h2>

      <div className="mt-3">
        {status === "loading" && (
          <p className="text-sm text-ink-faint">Loading friends...</p>
        )}

        {status === "failed" && (
          <div role="alert">
            <p className="text-sm text-burgundy">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded border border-rule px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-brass"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && friends.length === 0 && (
          <div>
            <p className="text-sm text-ink-muted">
              You do not have any friends yet.
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              Search for someone to study with.
            </p>
          </div>
        )}

        {status === "ready" && friends.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {friends.map((friend) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                isRemoving={removingFriendId === friend.id}
                onRemove={onRemove}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default FriendsList;
