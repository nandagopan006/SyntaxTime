/*
  One accepted study friend.

  Only a name. Study totals arrive with the leaderboard in the next phase, and
  showing an invented number here would be worse than showing none. Private
  notes and session history are never part of this.
*/
function FriendItem({ friend, isRemoving, onRemove }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded border border-rule bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-display text-lg text-ink">
          {friend.user.username}
        </p>
        <p className="text-sm text-ink-faint">Study friend</p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(friend)}
        disabled={isRemoving}
        className="shrink-0 rounded px-3 py-1.5 text-sm text-ink-faint hover:bg-surface-sunken hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brass"
      >
        {isRemoving ? "Removing..." : "Remove"}
      </button>
    </li>
  );
}

export default FriendItem;
