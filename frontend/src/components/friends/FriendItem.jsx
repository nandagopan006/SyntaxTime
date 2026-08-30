import Button from "../ui/Button";

/*
  One accepted study friend.

  Only a name. Study totals arrive with the leaderboard in the next phase, and
  showing an invented number here would be worse than showing none. Private
  notes and session history are never part of this.
*/
function FriendItem({ friend, isRemoving, onRemove }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-rule bg-surface-raised px-4 py-3 transition-colors hover:border-rule-strong">
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-ink">
          {friend.user.username}
        </p>
        <p className="text-sm text-ink-faint">Study friend</p>
      </div>

      <Button
        variant="danger"
        size="sm"
        onClick={() => onRemove(friend)}
        isBusy={isRemoving}
        busyLabel="Removing..."
        className="shrink-0"
      >
        Remove
      </Button>
    </li>
  );
}

export default FriendItem;
