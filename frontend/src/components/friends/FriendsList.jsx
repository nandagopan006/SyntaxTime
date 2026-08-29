import { Users } from "lucide-react";

import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Section from "../ui/Section";
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
    <Section title="Your friends">
      <div>
        {status === "loading" && (
          <p className="text-sm text-ink-faint">Loading friends...</p>
        )}

        {status === "failed" && (
          <div role="alert">
            <p className="text-sm text-burgundy">{errorMessage}</p>
            <Button variant="secondary" onClick={onRetry} className="mt-3">
              Try again
            </Button>
          </div>
        )}

        {status === "ready" && friends.length === 0 && (
          <EmptyState
            icon={Users}
            title="You do not have any friends yet."
            description="Search for someone to study with."
          />
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
    </Section>
  );
}

export default FriendsList;
