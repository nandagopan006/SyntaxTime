import Button from "../ui/Button";

/*
  One person the search turned up, with whatever action makes sense for them.

  The action comes from the relationship the API reported, not from anything
  the page assumes. Someone who has already asked you is not offered an Add
  button, and the server would refuse it anyway.
*/
function SearchResult({ user, isSending, onSendRequest }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-rule bg-surface-raised px-4 py-3 transition-colors hover:border-rule-strong">
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-ink">{user.username}</p>
        <p className="text-sm text-ink-faint">
          {user.relationship === "friends" ? "Study friend" : "SyntaxTime user"}
        </p>
      </div>

      <div className="shrink-0">
        {user.relationship === "none" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSendRequest(user)}
            isBusy={isSending}
            busyLabel="Sending..."
          >
            Add friend
          </Button>
        )}

        {/* The remaining states are statements, not buttons: there is nothing
            useful to do here, and offering an action the server would reject
            would only be misleading. */}
        {user.relationship === "request_sent" && (
          <span className="text-sm text-ink-muted">Request sent</span>
        )}

        {/* Answered in the requests panel beside this one, rather than with a
            second pair of Accept and Reject buttons on the same screen. */}
        {user.relationship === "request_received" && (
          <span className="text-sm text-brass">Sent you a request</span>
        )}

        {user.relationship === "friends" && (
          <span className="text-sm text-forest">Friends</span>
        )}
      </div>
    </li>
  );
}

export default SearchResult;
