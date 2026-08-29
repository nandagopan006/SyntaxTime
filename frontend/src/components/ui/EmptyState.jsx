/*
  What a section says when it has nothing to show.

  Nothing to show is a normal state, not a failure, so these read as an
  invitation rather than an apology. A quiet mark sits above the words so the
  block does not look like a rendering mistake.
*/
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="py-2">
      {Icon && (
        <span
          aria-hidden="true"
          className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-rule bg-surface-sunken text-ink-faint"
        >
          <Icon size={17} />
        </span>
      )}

      <p className="text-sm text-ink">{title}</p>

      {description && (
        <p className="mt-1 max-w-md text-sm text-ink-faint">{description}</p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
