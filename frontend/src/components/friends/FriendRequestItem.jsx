/*
  One friend request waiting for an answer.

  Used for both directions. An incoming request gets Accept and Reject; an
  outgoing one gets no buttons, because only the person who was asked may
  answer, and that rule is enforced by the server as well.
*/
function FriendRequestItem({ request, isOutgoing, busyAction, onAccept, onReject }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded border border-rule bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-display text-lg text-ink">
          {request.user.username}
        </p>
        <p className="text-sm text-ink-faint">
          {isOutgoing ? "Waiting for a reply" : "Wants to connect"}
        </p>
      </div>

      {isOutgoing ? (
        <span className="shrink-0 text-sm text-ink-muted">Pending</span>
      ) : (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onAccept(request)}
            disabled={Boolean(busyAction)}
            className="rounded bg-ink px-4 py-2 text-sm text-parchment disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brass"
          >
            {busyAction === "accept" ? "Accepting..." : "Accept"}
          </button>

          <button
            type="button"
            onClick={() => onReject(request)}
            disabled={Boolean(busyAction)}
            className="rounded border border-rule px-4 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brass"
          >
            {busyAction === "reject" ? "Rejecting..." : "Reject"}
          </button>
        </div>
      )}
    </li>
  );
}

export default FriendRequestItem;
