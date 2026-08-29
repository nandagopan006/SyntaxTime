import FriendRequestItem from "./FriendRequestItem";

/*
  Requests waiting to be answered, in both directions.

  The two lists sit together because they are the same question from either
  side: who is waiting on whom.
*/
function FriendRequests({
  incoming,
  sent,
  status,
  errorMessage,
  busyRequest,
  onAccept,
  onReject,
}) {
  return (
    <section aria-labelledby="requests-heading">
      <h2
        id="requests-heading"
        className="text-xs uppercase tracking-[0.15em] text-brass"
      >
        Friend requests
      </h2>

      <div className="mt-3">
        {status === "loading" && (
          <p className="text-sm text-ink-faint">Loading requests...</p>
        )}

        {status === "failed" && (
          <p className="text-sm text-burgundy" role="alert">
            {errorMessage}
          </p>
        )}

        {status === "ready" && incoming.length === 0 && (
          <p className="text-sm text-ink-muted">No pending friend requests.</p>
        )}

        {status === "ready" && incoming.length > 0 && (
          <ul className="space-y-2">
            {incoming.map((request) => (
              <FriendRequestItem
                key={request.id}
                request={request}
                busyAction={
                  busyRequest?.id === request.id ? busyRequest.action : null
                }
                onAccept={onAccept}
                onReject={onReject}
              />
            ))}
          </ul>
        )}
      </div>

      {status === "ready" && sent.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-ink-muted">Sent by you</h3>
          <ul className="mt-2 space-y-2">
            {sent.map((request) => (
              <FriendRequestItem key={request.id} request={request} isOutgoing />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default FriendRequests;
