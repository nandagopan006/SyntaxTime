import { useEffect, useState } from "react";

import FriendRequests from "../components/friends/FriendRequests";
import FriendsList from "../components/friends/FriendsList";
import UserSearch from "../components/friends/UserSearch";
import Leaderboard from "../components/leaderboard/Leaderboard";
import { getErrorMessage } from "../services/api";
import {
  acceptFriendRequest,
  getFriends,
  getIncomingRequests,
  getSentRequests,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "../services/friendService";

// The same short pause the History search uses: one request per word typed
// rather than one per letter.
const SEARCH_DEBOUNCE_MS = 300;

/*
  Friends: find people, answer requests, and see who you study alongside.

  Everything here is server data that no other page needs, so it lives in local
  state rather than Redux. Redux stays responsible for what really is shared:
  the running timer, the signed-in user, and global UI flags.
*/
function Friends() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle"); // idle | searching | ready | failed
  const [searchError, setSearchError] = useState("");

  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [requestsStatus, setRequestsStatus] = useState("loading");
  const [requestsError, setRequestsError] = useState("");

  const [friends, setFriends] = useState([]);
  const [friendsStatus, setFriendsStatus] = useState("loading");
  const [friendsError, setFriendsError] = useState("");

  // Which single button is mid-action, so only that one is disabled and no
  // action can be fired twice.
  const [sendingUserId, setSendingUserId] = useState(null);
  const [busyRequest, setBusyRequest] = useState(null); // { id, action }
  const [removingFriendId, setRemovingFriendId] = useState(null);
  // One line reports how the last action went, either way. Only failures were
  // reported before, so a request that worked looked the same as nothing
  // happening at all.
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  /** Loads the requests waiting in both directions. */
  async function loadRequests() {
    setRequestsStatus("loading");

    try {
      const [incomingRequests, sentRequests] = await Promise.all([
        getIncomingRequests(),
        getSentRequests(),
      ]);
      setIncoming(incomingRequests);
      setSent(sentRequests);
      setRequestsStatus("ready");
    } catch (error) {
      setRequestsError(getErrorMessage(error, "Unable to load friend requests."));
      setRequestsStatus("failed");
    }
  }

  /** Loads the accepted friends. */
  async function loadFriends() {
    setFriendsStatus("loading");

    try {
      setFriends(await getFriends());
      setFriendsStatus("ready");
    } catch (error) {
      setFriendsError(getErrorMessage(error, "Unable to load your friends."));
      setFriendsStatus("failed");
    }
  }

  useEffect(() => {
    loadRequests();
    loadFriends();
    // Runs once, when the page opens. The two loaders are redefined on every
    // render, so listing them here would re-run this effect forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The box updates as you type; the request waits until you stop.
  useEffect(() => {
    const timeoutId = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!search) {
      setResults([]);
      setSearchStatus("idle");
      return;
    }

    // Stops a slow earlier search from overwriting the results of a newer one.
    let isCurrent = true;

    async function runSearch() {
      setSearchStatus("searching");

      try {
        const users = await searchUsers(search);
        if (!isCurrent) {
          return;
        }
        setResults(users);
        setSearchStatus("ready");
      } catch (error) {
        if (!isCurrent) {
          return;
        }
        setSearchError(getErrorMessage(error, "Unable to search for users."));
        setSearchStatus("failed");
      }
    }

    runSearch();

    return () => {
      isCurrent = false;
    };
  }, [search]);

  /**
   * Reloads everything an action could have changed.
   *
   * Accepting a request moves someone out of the requests list and into the
   * friends list, and changes what their search result should offer. Asking
   * the server again is simpler than patching three lists by hand, and it
   * keeps the page agreeing with the database rather than with our guesses.
   */
  async function refreshRelationships() {
    await Promise.all([loadRequests(), loadFriends()]);

    if (search) {
      try {
        setResults(await searchUsers(search));
      } catch {
        // The lists above are refreshed and correct; a stale search row is a
        // small enough problem to leave until the next keystroke.
      }
    }
  }

  /** Clears the last result, so a new action never shows a stale outcome. */
  function startAction() {
    setActionError("");
    setActionMessage("");
  }

  async function handleSendRequest(user) {
    setSendingUserId(user.id);
    startAction();

    try {
      await sendFriendRequest(user.id);
      await refreshRelationships();
      setActionMessage(`Friend request sent to ${user.username}.`);
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to send that friend request."));
    }

    setSendingUserId(null);
  }

  async function handleAcceptRequest(request) {
    setBusyRequest({ id: request.id, action: "accept" });
    startAction();

    try {
      await acceptFriendRequest(request.id);
      await refreshRelationships();
      setActionMessage(`You and ${request.user.username} are now study friends.`);
    } catch (error) {
      // Nothing is moved into the friends list unless the server said yes.
      setActionError(getErrorMessage(error, "Unable to accept that request."));
    }

    setBusyRequest(null);
  }

  async function handleRejectRequest(request) {
    setBusyRequest({ id: request.id, action: "reject" });
    startAction();

    try {
      await rejectFriendRequest(request.id);
      await refreshRelationships();
      setActionMessage(`Request from ${request.user.username} declined.`);
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to reject that request."));
    }

    setBusyRequest(null);
  }

  async function handleRemoveFriend(friend) {
    setRemovingFriendId(friend.id);
    startAction();

    try {
      await removeFriend(friend.id);
      await refreshRelationships();
      setActionMessage(`${friend.user.username} is no longer a friend.`);
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to remove that friend."));
    }

    setRemovingFriendId(null);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-ink">Friends</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Connect with people you study alongside. Only your name is shared -
          your notes and sessions stay private.
        </p>
      </header>

      {actionError && (
        <p
          className="rounded border border-rule bg-surface px-4 py-3 text-sm text-burgundy"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {actionMessage && (
        <p
          className="rounded border border-rule bg-surface px-4 py-3 text-sm text-forest"
          role="status"
        >
          {actionMessage}
        </p>
      )}

      {/* First on the page, because comparing progress is what brings someone
          back to Friends. Searching and answering requests are occasional. */}
      <div className="border-t border-rule pt-6">
        <Leaderboard />
      </div>

      <div className="grid gap-8 border-t border-rule pt-6 lg:grid-cols-2 items-start">
        <UserSearch
          query={query}
          onQueryChange={setQuery}
          results={results}
          status={searchStatus}
          errorMessage={searchError}
          pendingUserId={sendingUserId}
          onSendRequest={handleSendRequest}
        />

        <FriendRequests
          incoming={incoming}
          sent={sent}
          status={requestsStatus}
          errorMessage={requestsError}
          busyRequest={busyRequest}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      </div>

      <div className="border-t border-rule pt-6">
        <FriendsList
          friends={friends}
          status={friendsStatus}
          errorMessage={friendsError}
          removingFriendId={removingFriendId}
          onRemove={handleRemoveFriend}
          onRetry={loadFriends}
        />
      </div>
    </div>
  );
}

export default Friends;
