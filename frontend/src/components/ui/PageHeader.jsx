/*
  The top of a page: what it is, and one line saying what it is for.

  History, Friends and Profile each wrote their own version of this. One
  component keeps the size, weight and rule beneath them identical.
*/
function PageHeader({ title, description, action }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl text-ink">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
        )}
      </div>

      {action}
    </header>
  );
}

export default PageHeader;
