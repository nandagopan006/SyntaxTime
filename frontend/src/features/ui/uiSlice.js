import { createSlice } from "@reduxjs/toolkit";

/*
  Small pieces of UI state that more than one component needs to agree on.

  The focus popup can be opened from the Home page and closed from inside the
  popup itself, so neither component can own the flag on its own.
*/
const initialState = {
  isFocusPopupOpen: false,
  isFocusModeActive: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openFocusPopup(state) {
      state.isFocusPopupOpen = true;
    },

    closeFocusPopup(state) {
      state.isFocusPopupOpen = false;
    },

    toggleFocusPopup(state) {
      state.isFocusPopupOpen = !state.isFocusPopupOpen;
    },

    enterFocusMode(state) {
      state.isFocusModeActive = true;
    },

    exitFocusMode(state) {
      state.isFocusModeActive = false;
    },
  },
});

export const {
  openFocusPopup,
  closeFocusPopup,
  toggleFocusPopup,
  enterFocusMode,
  exitFocusMode,
} = uiSlice.actions;

export default uiSlice.reducer;
