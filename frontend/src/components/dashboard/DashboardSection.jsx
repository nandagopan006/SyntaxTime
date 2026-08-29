/*
  The frame around each supporting dashboard section.

  The focus timer and the Today panel are cards, because they are what the user
  comes to Home for. Everything below them shares this lighter treatment - a
  brass heading and a hairline rule - so the page has an obvious order instead
  of a grid of identical boxes.
*/
function DashboardSection({ title, action, children }) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-xs uppercase tracking-[0.15em] text-brass">
          {title}
        </h2>
        {action}
      </div>

      <div className="mt-4 border-t border-rule pt-5">{children}</div>
    </section>
  );
}

export default DashboardSection;
