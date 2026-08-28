import { createSlice } from "@reduxjs/toolkit";

/*
  Authentication state.

  AuthContext is still the working source of truth for signing in and out.
  This slice is the destination that state will move to, once the login flow
  can actually be tested end to end.
*/
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Stores the signed-in user, after a login or a restored session. */
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
    },

    /** Clears the user on logout, or when a stored token is no longer valid. */
    clearUser(state) {
      state.user = null;
      state.isAuthenticated = false;
    },

    setLoading(state, action) {
      state.isLoading = action.payload;
    },
  },
});

export const { setUser, clearUser, setLoading } = authSlice.actions;
export default authSlice.reducer;
