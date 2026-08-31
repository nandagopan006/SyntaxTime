import { createContext, useContext } from "react";

/*
  The signed-in user, and the hook that reads it.

  Kept apart from AuthProvider because a file that exports both a component and
  something else cannot be hot-swapped: editing the provider would reload the
  whole page rather than replacing the component.

  Named for the hook rather than the context on purpose. A file called
  authContext.js sitting beside AuthContext.jsx is indistinguishable on
  Windows and macOS, where the filesystem ignores case, and imports quietly
  resolve to whichever one the bundler happens to find first.
*/

export const AuthContext = createContext(null);

/** Returns the signed-in user and the actions that change who that is. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
