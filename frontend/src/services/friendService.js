import api from "./api";

/*
  Everything the Friends page asks the server for.

  The same Axios client as the other services, so friend requests carry the
  signed-in user's token and refresh it the same way. The backend decides who
  the sender is from that token; no user id is ever sent for it.
*/

/**
 * Searches SyntaxTime users by username.
 *
 * Each result carries how that person already relates to you - "none",
 * "request_sent", "request_received" or "friends" - so the page never has to
 * guess which button to offer.
 */
export async function searchUsers(query) {
  const response = await api.get("/friends/search/", {
    params: { search: query },
  });

  return Array.isArray(response.data) ? response.data : [];
}

/** Returns the people who have accepted a friendship with the signed-in user. */
export async function getFriends() {
  const response = await api.get("/friends/");

  return Array.isArray(response.data) ? response.data : [];
}

/** Returns the pending requests waiting for the signed-in user to answer. */
export async function getIncomingRequests() {
  const response = await api.get("/friends/requests/");

  return Array.isArray(response.data) ? response.data : [];
}

/** Returns the requests the signed-in user has sent and not heard back from. */
export async function getSentRequests() {
  const response = await api.get("/friends/requests/", {
    params: { direction: "outgoing" },
  });

  return Array.isArray(response.data) ? response.data : [];
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
