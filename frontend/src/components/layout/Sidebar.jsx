import { NavLink } from "react-router-dom";

import { navigationItems } from "./navigationItems";

/*
  Persistent application navigation.

  On laptop screens it shows icons with labels. Below the lg breakpoint it
  narrows to an icon-only rail, which keeps the same layout on smaller screens
  without needing a separate mobile menu.
*/
function Sidebar() {
  return (
    <aside className="w-16 lg:w-60 shrink-0 border-r border-rule bg-surface flex flex-col">
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-rule">
        <span className="font-display text-xl text-ink hidden lg:block">
          SyntaxTime
        </span>
        <span className="font-display text-xl text-brass lg:hidden">S</span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 p-2 lg:p-3">
        <ul className="space-y-1">
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
                      "flex items-center justify-center lg:justify-start gap-3 rounded px-3 py-2 text-sm",
                      isActive
                        ? "bg-surface-sunken text-ink font-medium"
                        : "text-ink-muted hover:bg-surface-sunken/60 hover:text-ink",
                    ].join(" ")
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="hidden lg:inline">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
