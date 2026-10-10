use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, PredefinedMenuItem, Submenu},
    Url,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct DesktopInfo {
    pub name: String,
    pub version: String,
    pub platform: String,
    pub is_desktop: bool,
}

/// Safe desktop info command with no sensitive exposure.
#[tauri::command]
fn get_desktop_info() -> DesktopInfo {
    DesktopInfo {
        name: "AnalyzeIt".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        platform: std::env::consts::OS.into(),
        is_desktop: true,
    }
}

/// Strictly validated URL opener: only allows http/https schemes.
/// Rejects dangerous schemes like file://, javascript:, data:, vbscript:.
#[tauri::command]
fn open_external_url(app: tauri::AppHandle, raw_url: String) -> Result<(), String> {
    let parsed = Url::parse(&raw_url).map_err(|e| format!("Invalid URL: {e}"))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("Blocked: Only HTTP and HTTPS URLs are permitted.".into());
    }

    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(parsed.as_str(), None::<&str>)
        .map_err(|e| format!("Failed to open URL in browser: {e}"))?;

    Ok(())
}

/// Check if a given URL is considered an internal/trusted origin for the AnalyzeIt app.
fn is_internal_url(url: &Url) -> bool {
    let scheme = url.scheme();
    if scheme == "tauri" || scheme == "asset" {
        return true;
    }

    if scheme == "http" || scheme == "https" {
        if let Some(host) = url.host_str() {
            if host == "localhost" || host == "127.0.0.1" || host == "tauri.localhost" {
                return true;
            }
            if host == "analyzeit.in" || host.ends_with(".analyzeit.in") {
                return true;
            }
        }
    }

    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("security-navigation-guard")
                .on_navigation(|webview, url| {
                    if is_internal_url(url) {
                        true
                    } else {
                        // Prevent navigation away from the app inside the webview;
                        // safely route external links to the default OS browser.
                        use tauri_plugin_opener::OpenerExt;
                        let _ = webview.opener().open_url(url.as_str(), None::<&str>);
                        false
                    }
                })
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Create clean macOS native application menu
            let handle = app.handle();
            let app_menu = Submenu::with_items(
                handle,
                "AnalyzeIt",
                true,
                &[
                    &PredefinedMenuItem::about(handle, Some("About AnalyzeIt"), None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::services(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::hide(handle, None)?,
                    &PredefinedMenuItem::hide_others(handle, None)?,
                    &PredefinedMenuItem::show_all(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::quit(handle, None)?,
                ],
            )?;

            let edit_menu = Submenu::with_items(
                handle,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(handle, None)?,
                    &PredefinedMenuItem::redo(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::cut(handle, None)?,
                    &PredefinedMenuItem::copy(handle, None)?,
                    &PredefinedMenuItem::paste(handle, None)?,
                    &PredefinedMenuItem::select_all(handle, None)?,
                ],
            )?;

            let view_menu = Submenu::with_items(
                handle,
                "View",
                true,
                &[
                    &PredefinedMenuItem::fullscreen(handle, None)?,
                ],
            )?;

            let window_menu = Submenu::with_items(
                handle,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(handle, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::close_window(handle, None)?,
                ],
            )?;

            let menu = Menu::with_items(
                handle,
                &[&app_menu, &edit_menu, &view_menu, &window_menu],
            )?;
            app.set_menu(menu)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_desktop_info,
            open_external_url
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
