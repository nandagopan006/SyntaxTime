import { NavLink } from "react-router-dom";

import { navigationItems } from "./navigationItems";

/*
  The permanent navigation rail.

  Meant to read as part of the desk rather than a panel sitting on top of it:
  it shares the page's own ground, and only a hairline separates it from the
  work. On laptop screens it shows icons with labels; below the lg breakpoint
  it narrows to an icon-only rail, which keeps one layout instead of needing a
  separate mobile menu.
*/
function Sidebar() {
  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-rule bg-surface lg:w-60">
      <div className="flex h-16 items-center justify-center border-b border-rule lg:justify-start lg:px-6">
        {/* The wordmark is typographic on purpose. A drawn emblem would be one
            more thing competing with the timer. */}
        <span className="hidden text-xl tracking-tight text-ink lg:block font-display">
          Syntax<span className="text-brass">Time</span>
        </span>
        <span className="text-xl text-brass lg:hidden font-display">S</span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 p-2 lg:p-3">
        <ul className="space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  title={item.label}
                  className={({ isActive }) =>
                    [
                      "group relative flex items-center justify-center gap-3 rounded-md px-3 py-2",
                      "text-sm transition-colors lg:justify-start",
                      isActive
                        ? "bg-surface-sunken font-medium text-ink"
                        : "text-ink-muted hover:bg-surface-sunken/60 hover:text-ink",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* A brass rule down the left edge marks the current
                          page, so the active item is not only a shade. */}
                      <span
                        aria-hidden="true"
                        className={[
                          "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-colors",
                          isActive ? "bg-brass" : "bg-transparent",
                        ].join(" ")}
                      />

                      <Icon
                        size={18}
                        aria-hidden="true"
                        className={isActive ? "text-brass" : ""}
                      />
                      <span className="hidden lg:inline">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="hidden border-t border-rule px-6 py-4 text-xs text-ink-faint lg:block">
        Focus. Record. Review.
      </p>
    </aside>
  );
}

export default Sidebar;
