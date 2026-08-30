// Stops a console window opening behind the application on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent};

/*
    The SyntaxTime desktop shell.

    Deliberately almost empty. The timer, the sessions and every rule about
    them live in the React application and in Django; Rust here only opens
    windows and decides what closing one means. Moving any study logic down
    here would give SyntaxTime two places to disagree with itself about how
    long somebody has been working.
*/

/// The compact always-on-top timer window.
const FOCUS_WINDOW_LABEL: &str = "focus";

fn main() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if window.label() != FOCUS_WINDOW_LABEL {
                return;
            }

            // Closing the focus window must never end the session. The window
            // is hidden instead of destroyed, so the timer keeps running, the
            // state listener stays alive, and reopening shows the session as
            // it is now rather than as it was.
            //
            // Enforced here rather than in JavaScript because this is the
            // operating system's close button: the web page never sees it.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            // The focus window is declared in the configuration so there can
            // only ever be one of it. It starts hidden and is shown on
            // request, which also means no window-creation permission has to
            // be granted to the frontend.
            if let Some(focus_window) = app.get_webview_window(FOCUS_WINDOW_LABEL) {
                let _ = focus_window.set_always_on_top(true);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SyntaxTime");
}
