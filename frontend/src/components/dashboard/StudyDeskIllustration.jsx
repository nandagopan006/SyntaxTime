/*
  A quiet line drawing of a study desk: lamp, books and an inkwell.

  Drawn as inline SVG rather than loaded as a photograph, so it inherits the
  parchment and brass tokens, stays sharp at any size, and adds nothing to the
  page weight. It is decorative, so it is hidden from screen readers.
*/
function StudyDeskIllustration({ className = "" }) {
  return (
    <svg
      viewBox="0 0 240 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* The lamp's pool of light, kept very faint so text stays readable. */}
      <circle cx="58" cy="96" r="46" className="fill-brass-soft/10" />

      {/* Desk lamp */}
      <path
        d="M40 100V56M40 56l22-16"
        className="stroke-ink-muted"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M52 44h26l-7 16H59z"
        className="fill-brass-soft/30 stroke-brass"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M28 100h24"
        className="stroke-ink-muted"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Stack of closed books */}
      <rect x="96" y="86" width="54" height="8" rx="1.5" className="stroke-ink-muted" strokeWidth="2" />
      <rect x="100" y="76" width="54" height="10" rx="1.5" className="stroke-brass" strokeWidth="2" />
      <rect x="94" y="66" width="54" height="10" rx="1.5" className="stroke-ink-muted" strokeWidth="2" />

      {/* An open book, mid-read */}
      <path
        d="M164 96V72c8-5 18-5 26 0v24c-8-5-18-5-26 0z"
        className="stroke-ink-muted"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M190 96V72c8-5 18-5 26 0v24c-8-5-18-5-26 0z"
        className="stroke-ink-muted"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M190 72v24" className="stroke-brass" strokeWidth="2" />

      {/* The desk itself */}
      <path
        d="M16 100h208"
        className="stroke-rule"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default StudyDeskIllustration;
