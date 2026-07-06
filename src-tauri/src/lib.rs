use image::{DynamicImage, ImageFormat};
use serde::Serialize;
use std::io::Cursor;
use xcap::Window;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptureWindowInfo {
    id: u32,
    app_name: String,
    title: String,
    width: u32,
    height: u32,
    x: i32,
    y: i32,
    is_focused: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CapturedWindowImage {
    window: CaptureWindowInfo,
    png_bytes: Vec<u8>,
}

const OFFICIAL_DB_URL: &str = "sqlite:trading-journal.db";
const DEV_DB_URL: &str = "sqlite:trading-journal-dev.db";

fn window_info(window: &Window) -> Option<CaptureWindowInfo> {
    if window.is_minimized().unwrap_or(true) {
        return None;
    }

    let app_name = window.app_name().unwrap_or_default();
    let title = window.title().unwrap_or_default();
    let width = window.width().unwrap_or(0);
    let height = window.height().unwrap_or(0);

    if width < 80 || height < 80 {
        return None;
    }

    if app_name.trim().is_empty() && title.trim().is_empty() {
        return None;
    }

    Some(CaptureWindowInfo {
        id: window.id().ok()?,
        app_name,
        title,
        width,
        height,
        x: window.x().unwrap_or_default(),
        y: window.y().unwrap_or_default(),
        is_focused: window.is_focused().unwrap_or(false),
    })
}

fn capture_windows() -> Result<Vec<(Window, CaptureWindowInfo)>, String> {
    let windows = Window::all().map_err(|error| format!("WINDOW_LIST_FAILED: {error}"))?;
    Ok(windows
        .into_iter()
        .filter_map(|window| window_info(&window).map(|info| (window, info)))
        .collect())
}

fn is_tradingview_window(info: &CaptureWindowInfo) -> bool {
    let text = format!("{} {}", info.app_name, info.title).to_lowercase();
    text.contains("tradingview")
}

fn capture_window_image(
    window: &Window,
    info: CaptureWindowInfo,
) -> Result<CapturedWindowImage, String> {
    let image = window
        .capture_image()
        .map_err(|error| format!("WINDOW_CAPTURE_FAILED: {error}"))?;
    let mut cursor = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(image)
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|error| format!("PNG_ENCODE_FAILED: {error}"))?;

    Ok(CapturedWindowImage {
        window: info,
        png_bytes: cursor.into_inner(),
    })
}

#[tauri::command]
fn list_capture_windows() -> Result<Vec<CaptureWindowInfo>, String> {
    Ok(capture_windows()?
        .into_iter()
        .map(|(_, info)| info)
        .collect())
}

#[tauri::command]
fn capture_tradingview_window() -> Result<CapturedWindowImage, String> {
    let windows = capture_windows()?;
    let (window, info) = windows
        .into_iter()
        .find(|(_, info)| is_tradingview_window(info))
        .ok_or_else(|| "TRADINGVIEW_NOT_FOUND".to_string())?;
    capture_window_image(&window, info)
}

#[tauri::command]
fn capture_window_by_id(window_id: u32) -> Result<CapturedWindowImage, String> {
    let windows = capture_windows()?;
    let (window, info) = windows
        .into_iter()
        .find(|(window, _)| window.id().ok() == Some(window_id))
        .ok_or_else(|| "WINDOW_NOT_FOUND".to_string())?;
    capture_window_image(&window, info)
}

fn sql_migrations() -> Vec<tauri_plugin_sql::Migration> {
    vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "add_pretrade_and_screenshots",
            sql: include_str!("../migrations/0002_pretrade.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 3,
            description: "add_trade_workflow_fields",
            sql: include_str!("../migrations/0003_trade_workflow.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 4,
            description: "add_account_system",
            sql: include_str!("../migrations/0004_accounts.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 5,
            description: "add_strategy_rules",
            sql: include_str!("../migrations/0005_strategy_rules.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 6,
            description: "add_risk_plan_limits",
            sql: include_str!("../migrations/0006_risk_plan_limits.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 7,
            description: "add_account_context",
            sql: include_str!("../migrations/0007_account_context.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 8,
            description: "add_trade_recap_structure",
            sql: include_str!("../migrations/0008_trade_recap_structure.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(OFFICIAL_DB_URL, sql_migrations())
                .add_migrations(DEV_DB_URL, sql_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            list_capture_windows,
            capture_tradingview_window,
            capture_window_by_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running Trading Journal");
}
