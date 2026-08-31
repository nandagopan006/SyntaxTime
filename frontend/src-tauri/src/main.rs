// Stops a console window opening behind the application on Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

/*
    The SyntaxTime desktop shell.

    Deliberately almost empty. The timer, the sessions and every rule about
    them live in the React application and in Django; Rust here only opens
    windows, keeps the application alive in the notification area, and decides
    what closing a window means. Moving any study logic down here would give
    SyntaxTime two places to disagree with itself about how long somebody has
    been working.
*/

const MAIN_WINDOW_LABEL: &str = "main";

/// The compact always-on-top timer window.
const FOCUS_WINDOW_LABEL: &str = "focus";

/// Brings a window back from hidden and puts it in front.
fn show_window(app: &tauri::AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        // Native notifications, so a session that ends while the user is
        // in their editor still reaches them.
        .plugin(tauri_plugin_notification::init())
        .on_window_event(|window, event| {
            let WindowEvent::CloseRequested { api, .. } = event else {
                return;
            };

            match window.label() {
                // Closing the focus window must never end the session. It is
                // hidden instead of destroyed, so the timer keeps running, the
                // state listener stays alive, and reopening shows the session
                // as it is now rather than as it was.
                FOCUS_WINDOW_LABEL => {
                    api.prevent_close();
                    let _ = window.hide();
                }

                // Closing the main window leaves SyntaxTime running in the
                // notification area. A study timer that stops because its
                // window was tidied away is not a study timer, and the tray
                // menu is where the application is actually quit.
                MAIN_WINDOW_LABEL => {
                    api.prevent_close();
                    let _ = window.hide();
                }

                _ => {}
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

            // Three items and no more. The tray is how the application is
            // reopened and quit once its windows are hidden; anything else
            // belongs in the application itself.
            let open = MenuItem::with_id(app, "open", "Open SyntaxTime", true, None::<&str>)?;
            let focus = MenuItem::with_id(app, "focus", "Focus timer", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &focus, &quit])?;

            TrayIconBuilder::with_id("syntaxtime")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("SyntaxTime")
                .menu(&menu)
                // The menu is for the right button; a left click should just
                // bring the application back, which is what people expect of
                // a tray icon.
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_window(app, MAIN_WINDOW_LABEL),
                    "focus" => {
                        if let Some(window) = app.get_webview_window(FOCUS_WINDOW_LABEL) {
                            // Re-asserted here too: Windows can drop the flag
                            // while another application owns the screen.
                            let _ = window.set_always_on_top(true);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    // The only way out. Everything else hides rather than
                    // closes, so without this the application could not be
                    // quit at all.
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_window(tray.app_handle(), MAIN_WINDOW_LABEL);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SyntaxTime");
}
