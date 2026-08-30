/*
  What a section shows while it waits.

  Quiet grey bars rather than a spinner: they hint at the shape of what is
  coming and do not pull the eye away from a running timer. `label` is read by
  assistive technology, which cannot see the bars.
*/
function LoadingState({ label = "Loading...", lines = 3 }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2.5">
      <span className="sr-only">{label}</span>

      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-3 rounded-sm bg-surface-sunken"
          // Uneven widths read as text waiting to arrive, rather than a
          // block of identical placeholder bars.
          style={{ width: `${[92, 74, 83, 66, 78][index % 5]}%` }}
        />
      ))}
    </div>
  );
}

export default LoadingState;
