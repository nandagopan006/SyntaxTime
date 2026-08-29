/*
  A titled block of a page.

  The dashboard, friends, leaderboard and profile all drew the same thing by
  hand: a small brass heading, an optional action opposite it, and a hairline
  before the content. Doing it once keeps every section on the same rhythm.
*/
function Section({ title, action, children }) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={headingId} className="section-eyebrow font-sans">
          {title}
        </h2>
        {action}
      </div>

      <div className="mt-4 border-t border-rule pt-5">{children}</div>
    </section>
  );
}

export default Section;
