import Button from "../ui/Button";

/**
 * Says how much of a list is on screen, and offers the rest.
 *
 * Shown under every list on Friends that can grow, so "10 of 37" always means
 * the same thing wherever it appears.
 */
function LoadMore({ shown, total, hasMore, isLoading, label, onLoadMore }) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-faint tabular-nums">
        Showing {shown} of {total}
      </p>

      <Button
        variant="secondary"
        size="sm"
        onClick={onLoadMore}
        isBusy={isLoading}
        busyLabel="Loading..."
      >
        {label}
      </Button>
    </div>
  );
}

export default LoadMore;
