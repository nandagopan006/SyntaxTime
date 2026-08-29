import Button from "../ui/Button";

/*
  One friend request waiting for an answer.

  Used for both directions. An incoming request gets Accept and Reject; an
  outgoing one gets no buttons, because only the person who was asked may
  answer, and that rule is enforced by the server as well.
*/
function FriendRequestItem({ request, isOutgoing, busyAction, onAccept, onReject }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-rule bg-surface-raised px-4 py-3 transition-colors hover:border-rule-strong">
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-ink">
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
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAccept(request)}
            disabled={Boolean(busyAction)}
            isBusy={busyAction === "accept"}
            busyLabel="Accepting..."
          >
            Accept
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onReject(request)}
            disabled={Boolean(busyAction)}
            isBusy={busyAction === "reject"}
            busyLabel="Rejecting..."
          >
            Reject
          </Button>
        </div>
      )}
    </li>
  );
}

export default FriendRequestItem;
