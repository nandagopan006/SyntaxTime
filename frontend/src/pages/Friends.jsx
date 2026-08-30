import { useCallback, useEffect, useState } from "react";

import FriendRequests from "../components/friends/FriendRequests";
import FriendsList from "../components/friends/FriendsList";
import LoadMore from "../components/friends/LoadMore";
import UserSearch from "../components/friends/UserSearch";
import Leaderboard from "../components/leaderboard/Leaderboard";
import PageHeader from "../components/ui/PageHeader";
import { usePaginatedList } from "../hooks/usePaginatedList";
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

  All four lists arrive a page at a time. Somebody with two hundred friends
  should get the same page as somebody with two, so nothing here ever asks for
  a whole list.
*/
function Friends() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

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

  // useCallback on each fetcher, or the hook would treat every render as a
  // new source and reload endlessly.
  const searchResults = usePaginatedList({
    fetchPage: useCallback((page) => searchUsers(search, page), [search]),
    failureMessage: "Unable to search for users.",
    // Nothing is loading until something is typed.
    initialStatus: "idle",
  });

  const incoming = usePaginatedList({
    fetchPage: useCallback((page) => getIncomingRequests(page), []),
    failureMessage: "Unable to load friend requests.",
  });

  const sent = usePaginatedList({
    fetchPage: useCallback((page) => getSentRequests(page), []),
    failureMessage: "Unable to load friend requests.",
  });

  const friends = usePaginatedList({
    fetchPage: useCallback((page) => getFriends(page), []),
    failureMessage: "Unable to load your friends.",
  });

  const { load: loadIncoming } = incoming;
  const { load: loadSent } = sent;
  const { load: loadFriends } = friends;

  useEffect(() => {
    loadIncoming();
    loadSent();
    loadFriends();
  }, [loadIncoming, loadSent, loadFriends]);

  // The box updates as you type; the request waits until you stop.
  useEffect(() => {
    const timeoutId = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const { load: loadSearch, reset: resetSearch } = searchResults;

  // A new search always starts from the first page: page three of the previous
  // query means nothing for this one.
  useEffect(() => {
    if (!search) {
      resetSearch();
      return;
    }

    loadSearch();
  }, [search, loadSearch, resetSearch]);

  /**
   * Reloads everything an action could have changed.
   *
   * Accepting a request moves someone out of the requests list and into the
   * friends list, and changes what their search result should offer. Asking
   * the server again is simpler than patching three lists by hand, and it
   * keeps the page agreeing with the database rather than with our guesses.
   *
   * Only these lists: nothing on Home, History or Profile depends on who your
   * friends are, apart from the leaderboard, which reloads itself.
   */
  async function refreshRelationships() {
    await Promise.all([loadIncoming(), loadSent(), loadFriends()]);

    if (search) {
      await loadSearch();
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
      <PageHeader
        title="Friends"
        description="Connect with people you study alongside. Only your name is shared - your notes and sessions stay private."
      />

      {actionError && (
        <p
          className="rounded-md border border-burgundy/25 bg-burgundy/5 px-4 py-3 text-sm text-burgundy"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {actionMessage && (
        <p
          className="rounded-md border border-forest/25 bg-forest/5 px-4 py-3 text-sm text-forest"
          role="status"
        >
          {actionMessage}
        </p>
      )}

      {/* Managing who you study with comes first. The leaderboard is what
          brings someone back, but it is not what they came here to do, and
          scrolling past it to answer a request would be the wrong way round. */}
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <div>
          <UserSearch
            query={query}
            onQueryChange={setQuery}
            results={searchResults.items}
            status={searchResults.status}
            errorMessage={searchResults.errorMessage}
            pendingUserId={sendingUserId}
            onSendRequest={handleSendRequest}
          />

          <LoadMore
            shown={searchResults.items.length}
            total={searchResults.count}
            hasMore={searchResults.hasMore}
            isLoading={searchResults.isLoadingMore}
            label="More results"
            onLoadMore={searchResults.loadMore}
          />
        </div>

        <div>
          <FriendRequests
            incoming={incoming.items}
            sent={sent.items}
            status={incoming.status}
            errorMessage={incoming.errorMessage}
            busyRequest={busyRequest}
            onAccept={handleAcceptRequest}
            onReject={handleRejectRequest}
          />

          <LoadMore
            shown={incoming.items.length}
            total={incoming.count}
            hasMore={incoming.hasMore}
            isLoading={incoming.isLoadingMore}
            label="More requests"
            onLoadMore={incoming.loadMore}
          />

          <LoadMore
            shown={sent.items.length}
            total={sent.count}
            hasMore={sent.hasMore}
            isLoading={sent.isLoadingMore}
            label="More sent requests"
            onLoadMore={sent.loadMore}
          />
        </div>
      </div>

      <div className="border-t border-rule pt-6">
        <FriendsList
          friends={friends.items}
          status={friends.status}
          errorMessage={friends.errorMessage}
          removingFriendId={removingFriendId}
          onRemove={handleRemoveFriend}
          onRetry={loadFriends}
        />

        <LoadMore
          shown={friends.items.length}
          total={friends.count}
          hasMore={friends.hasMore}
          isLoading={friends.isLoadingMore}
          label="More friends"
          onLoadMore={friends.loadMore}
        />
      </div>

      <div className="border-t border-rule pt-6">
        <Leaderboard />
      </div>
    </div>
  );
}

export default Friends;
