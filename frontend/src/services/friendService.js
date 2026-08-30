import api from "./api";

/*
  Everything the Friends page asks the server for.

  The same Axios client as the other services, so friend requests carry the
  signed-in user's token and refresh it the same way. The backend decides who
  the sender is from that token; no user id is ever sent for it.
*/

/**
 * Reads a paginated list response into the shape the Friends page works with.
 *
 * Friends, requests and search results all grow without limit, so all three
 * arrive a page at a time. `hasMore` is what the Load more buttons read, and
 * `count` is the total behind them, so the page can say "10 of 37".
 */
function readPage(data) {
  return {
    results: Array.isArray(data?.results) ? data.results : [],
    count: data?.count ?? 0,
    hasMore: Boolean(data?.next),
  };
}

/**
 * Searches SyntaxTime users by username.
 *
 * Each result carries how that person already relates to you - "none",
 * "request_sent", "request_received" or "friends" - so the page never has to
 * guess which button to offer.
 */
export async function searchUsers(query, page = 1) {
  const response = await api.get("/friends/search/", {
    params: { search: query, page },
  });

  return readPage(response.data);
}

/** Returns the people who have accepted a friendship with the signed-in user. */
export async function getFriends(page = 1) {
  const response = await api.get("/friends/", { params: { page } });

  return readPage(response.data);
}

/** Returns the pending requests waiting for the signed-in user to answer. */
export async function getIncomingRequests(page = 1) {
  const response = await api.get("/friends/requests/", { params: { page } });

  return readPage(response.data);
}

/** Returns the requests the signed-in user has sent and not heard back from. */
export async function getSentRequests(page = 1) {
  const response = await api.get("/friends/requests/", {
    params: { direction: "outgoing", page },
  });

  return readPage(response.data);
}

/** Asks another user to be a study friend. */
export async function sendFriendRequest(userId) {
  const response = await api.post("/friends/requests/", { receiver_id: userId });
  return response.data;
}

/** Accepts a request that was sent to the signed-in user. */
export async function acceptFriendRequest(requestId) {
  const response = await api.patch(`/friends/requests/${requestId}/`, {
    status: "accepted",
  });
  return response.data;
}

/** Declines a request that was sent to the signed-in user. */
export async function rejectFriendRequest(requestId) {
  const response = await api.patch(`/friends/requests/${requestId}/`, {
    status: "rejected",
  });
  return response.data;
}

/** Ends a friendship. Either person may do this. */
export async function removeFriend(friendshipId) {
  await api.delete(`/friends/${friendshipId}/`);
}
