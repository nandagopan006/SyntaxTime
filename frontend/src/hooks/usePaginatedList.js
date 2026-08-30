import { useCallback, useState } from "react";

import { getErrorMessage } from "../services/api";

/*
  One list that arrives a page at a time.

  Friends, incoming requests, sent requests and search results all grow
  without limit, and all four behave identically: load the first page, append
  later ones on request, and remember how many there are altogether. Four
  copies of that would drift, so it is written once here.
*/

/**
 * Holds a server list that is fetched a page at a time.
 *
 * `fetchPage` is given a page number and returns `{ results, count, hasMore }`.
 * Wrap it in useCallback in the caller, or every render will look like a new
 * fetcher.
 *
 * `initialStatus` is "loading" for a list that is fetched as soon as the page
 * opens, so the very first paint shows a loading state rather than flashing an
 * empty one before the effect has run. Search passes "idle", because an empty
 * box is genuinely showing nothing rather than waiting for anything.
 */
export function usePaginatedList({
  fetchPage,
  failureMessage,
  initialStatus = "loading",
}) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState(initialStatus); // idle | loading | ready | failed
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  /** Loads the first page, replacing anything already held. */
  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const data = await fetchPage(1);
      setItems(data.results);
      setCount(data.count);
      setHasMore(data.hasMore);
      setPage(1);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, failureMessage));
      setStatus("failed");
    }
  }, [fetchPage, failureMessage]);

  /** Adds the next page to what is already on screen. */
  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);

    try {
      const data = await fetchPage(page + 1);
      setItems((existing) => [...existing, ...data.results]);
      setHasMore(data.hasMore);
      setPage((current) => current + 1);
      setErrorMessage("");
    } catch (error) {
      // What is already on screen stays: a failed extra page is no reason to
      // take away the rows that loaded fine.
      setErrorMessage(getErrorMessage(error, failureMessage));
    }

    setIsLoadingMore(false);
  }, [fetchPage, failureMessage, page]);

  /** Empties the list without asking the server anything. */
  const reset = useCallback(() => {
    setItems([]);
    setCount(0);
    setPage(1);
    setHasMore(false);
    setStatus("idle");
    setErrorMessage("");
  }, []);

  return {
    items,
    count,
    hasMore,
    status,
    errorMessage,
    isLoadingMore,
    load,
    loadMore,
    reset,
  };
}
