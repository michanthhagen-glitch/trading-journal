use image::{DynamicImage, ImageFormat};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Cursor,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
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
    is_minimized: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CapturedWindowImage {
    window: CaptureWindowInfo,
    png_bytes: Vec<u8>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct JournalBackupResult {
    folder_path: String,
    screenshot_files: u64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JournalBackupManifest {
    version: u32,
    app: String,
    database: String,
    created_at: String,
    screenshot_files: u64,
}

const OFFICIAL_DB_URL: &str = "sqlite:trading-journal.db";
const DEV_DB_URL: &str = "sqlite:trading-journal-dev.db";

fn capture_window_dimensions_are_usable(is_minimized: bool, width: u32, height: u32) -> bool {
    (cfg!(target_os = "windows") && is_minimized) || (width >= 80 && height >= 80)
}

fn window_info(window: &Window) -> Option<CaptureWindowInfo> {
    let is_minimized = window.is_minimized().unwrap_or(true);
    if !cfg!(target_os = "windows") && is_minimized {
        return None;
    }

    let app_name = window.app_name().unwrap_or_default();
    let title = window.title().unwrap_or_default();
    let width = window.width().unwrap_or(0);
    let height = window.height().unwrap_or(0);

    if !capture_window_dimensions_are_usable(is_minimized, width, height) {
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
        is_minimized,
    })
}

#[cfg(target_os = "windows")]
mod native_window {
    use std::{ffi::c_void, thread, time::Duration};

    const SW_MINIMIZE: i32 = 6;
    const SW_RESTORE: i32 = 9;

    #[link(name = "user32")]
    unsafe extern "system" {
        fn GetForegroundWindow() -> *mut c_void;
        fn SetForegroundWindow(window: *mut c_void) -> i32;
        fn ShowWindow(window: *mut c_void, command: i32) -> i32;
    }

    pub struct RestoredWindow {
        window: *mut c_void,
        previous_focus: *mut c_void,
    }

    impl RestoredWindow {
        pub fn new(window_id: u32, was_minimized: bool) -> Option<Self> {
            if !was_minimized {
                return None;
            }

            let window = window_id as usize as *mut c_void;
            let previous_focus = unsafe { GetForegroundWindow() };
            unsafe {
                ShowWindow(window, SW_RESTORE);
                SetForegroundWindow(window);
            }
            thread::sleep(Duration::from_millis(450));
            Some(Self {
                window,
                previous_focus,
            })
        }
    }

    impl Drop for RestoredWindow {
        fn drop(&mut self) {
            unsafe {
                ShowWindow(self.window, SW_MINIMIZE);
                if !self.previous_focus.is_null() {
                    SetForegroundWindow(self.previous_focus);
                }
            }
        }
    }
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
    #[cfg(target_os = "windows")]
    let _restored_window = native_window::RestoredWindow::new(info.id, info.is_minimized);

    #[cfg(not(target_os = "windows"))]
    if info.is_minimized {
        return Err("WINDOW_MINIMIZED".to_string());
    }

    let info = window_info(window).unwrap_or(info);
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

fn validate_database_filename(value: &str) -> Result<(), String> {
    match value {
        "trading-journal.db" | "trading-journal-dev.db" => Ok(()),
        _ => Err("BACKUP_DATABASE_NOT_ALLOWED".to_string()),
    }
}

fn validate_backup_folder_name(value: &str) -> Result<(), String> {
    if value.trim().is_empty()
        || value.contains("..")
        || value.contains('/')
        || value.contains('\\')
    {
        return Err("BACKUP_FOLDER_NAME_INVALID".to_string());
    }
    Ok(())
}

fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("FILE_REMOVE_FAILED: {error}"))?;
    }
    Ok(())
}

fn remove_dir_if_exists(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|error| format!("DIR_REMOVE_FAILED: {error}"))?;
    }
    Ok(())
}

fn copy_dir_recursive(source: &Path, destination: &Path) -> Result<u64, String> {
    fs::create_dir_all(destination).map_err(|error| format!("DIR_CREATE_FAILED: {error}"))?;
    let mut copied_files = 0;
    for entry in fs::read_dir(source).map_err(|error| format!("DIR_READ_FAILED: {error}"))? {
        let entry = entry.map_err(|error| format!("DIR_ENTRY_FAILED: {error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        let file_type = entry
            .file_type()
            .map_err(|error| format!("FILE_TYPE_FAILED: {error}"))?;
        if file_type.is_dir() {
            copied_files += copy_dir_recursive(&source_path, &destination_path)?;
        } else if file_type.is_file() {
            fs::copy(&source_path, &destination_path)
                .map_err(|error| format!("FILE_COPY_FAILED: {error}"))?;
            copied_files += 1;
        }
    }
    Ok(copied_files)
}

fn reject_path_inside_parent(path: &Path, parent: &Path, error_code: &str) -> Result<(), String> {
    if !parent.exists() {
        return Ok(());
    }
    let resolved_path = path
        .canonicalize()
        .map_err(|error| format!("PATH_RESOLVE_FAILED: {error}"))?;
    let resolved_parent = parent
        .canonicalize()
        .map_err(|error| format!("PATH_RESOLVE_FAILED: {error}"))?;
    if resolved_path.starts_with(resolved_parent) {
        return Err(error_code.to_string());
    }
    Ok(())
}

fn restore_database_file(staged: &Path, current: &Path, previous: &Path) -> Result<(), String> {
    remove_file_if_exists(previous)?;
    if current.exists() {
        fs::rename(current, previous)
            .map_err(|error| format!("CURRENT_DATABASE_BACKUP_FAILED: {error}"))?;
    }
    if let Err(error) = fs::rename(staged, current) {
        if previous.exists() {
            let _ = fs::rename(previous, current);
        }
        return Err(format!("DATABASE_RESTORE_FAILED: {error}"));
    }
    Ok(())
}

fn rollback_database(current: &Path, previous: &Path) {
    let _ = remove_file_if_exists(current);
    if previous.exists() {
        let _ = fs::rename(previous, current);
    }
}

#[tauri::command]
fn backup_journal(
    app: AppHandle,
    destination_root: String,
    folder_name: String,
    db_filename: String,
    created_at: String,
) -> Result<JournalBackupResult, String> {
    validate_database_filename(&db_filename)?;
    validate_backup_folder_name(&folder_name)?;

    let destination_root = PathBuf::from(destination_root);
    if !destination_root.is_dir() {
        return Err("BACKUP_DESTINATION_NOT_FOUND".to_string());
    }

    let backup_dir = destination_root.join(folder_name);
    if backup_dir.exists() {
        return Err("BACKUP_FOLDER_ALREADY_EXISTS".to_string());
    }

    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("APP_CONFIG_DIR_FAILED: {error}"))?;
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("APP_DATA_DIR_FAILED: {error}"))?;
    let database_path = config_dir.join(&db_filename);
    if !database_path.is_file() {
        return Err("JOURNAL_DATABASE_NOT_FOUND".to_string());
    }

    let screenshots_path = data_dir.join("screenshots");
    reject_path_inside_parent(
        &destination_root,
        &screenshots_path,
        "BACKUP_DESTINATION_INSIDE_SCREENSHOTS",
    )?;

    let result = (|| {
        fs::create_dir_all(&backup_dir)
            .map_err(|error| format!("BACKUP_FOLDER_CREATE_FAILED: {error}"))?;
        fs::copy(&database_path, backup_dir.join(&db_filename))
            .map_err(|error| format!("DATABASE_BACKUP_FAILED: {error}"))?;

        let screenshot_files = if screenshots_path.is_dir() {
            copy_dir_recursive(&screenshots_path, &backup_dir.join("screenshots"))?
        } else {
            0
        };
        let manifest = JournalBackupManifest {
            version: 1,
            app: "MethodMark".to_string(),
            database: db_filename.clone(),
            created_at,
            screenshot_files,
        };
        let manifest_bytes = serde_json::to_vec_pretty(&manifest)
            .map_err(|error| format!("BACKUP_MANIFEST_FAILED: {error}"))?;
        fs::write(backup_dir.join("backup.json"), manifest_bytes)
            .map_err(|error| format!("BACKUP_MANIFEST_WRITE_FAILED: {error}"))?;
        Ok(JournalBackupResult {
            folder_path: backup_dir.to_string_lossy().to_string(),
            screenshot_files,
        })
    })();

    if result.is_err() {
        let _ = fs::remove_dir_all(&backup_dir);
    }
    result
}

#[tauri::command]
fn restore_journal(
    app: AppHandle,
    backup_dir: String,
    db_filename: String,
) -> Result<JournalBackupResult, String> {
    validate_database_filename(&db_filename)?;
    let backup_dir = PathBuf::from(backup_dir);
    if !backup_dir.is_dir() {
        return Err("BACKUP_FOLDER_NOT_FOUND".to_string());
    }

    let manifest_bytes = fs::read(backup_dir.join("backup.json"))
        .map_err(|_| "BACKUP_MANIFEST_NOT_FOUND".to_string())?;
    let manifest: JournalBackupManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|_| "BACKUP_MANIFEST_INVALID".to_string())?;
    if manifest.version != 1 || manifest.database != db_filename {
        return Err("BACKUP_DOES_NOT_MATCH_THIS_APP".to_string());
    }

    let backup_database = backup_dir.join(&db_filename);
    if !backup_database.is_file() {
        return Err("BACKUP_DATABASE_NOT_FOUND".to_string());
    }

    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("APP_CONFIG_DIR_FAILED: {error}"))?;
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("APP_DATA_DIR_FAILED: {error}"))?;
    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("APP_CONFIG_CREATE_FAILED: {error}"))?;
    fs::create_dir_all(&data_dir).map_err(|error| format!("APP_DATA_CREATE_FAILED: {error}"))?;

    let current_database = config_dir.join(&db_filename);
    let staged_database = config_dir.join(format!("{db_filename}.restore-new"));
    let previous_database = config_dir.join(format!("{db_filename}.restore-old"));
    remove_file_if_exists(&staged_database)?;
    fs::copy(&backup_database, &staged_database)
        .map_err(|error| format!("BACKUP_DATABASE_STAGE_FAILED: {error}"))?;

    let current_screenshots = data_dir.join("screenshots");
    reject_path_inside_parent(
        &backup_dir,
        &current_screenshots,
        "BACKUP_FOLDER_INSIDE_ACTIVE_SCREENSHOTS",
    )?;
    let staged_screenshots = data_dir.join("screenshots.restore-new");
    let previous_screenshots = data_dir.join("screenshots.restore-old");
    remove_dir_if_exists(&staged_screenshots)?;
    remove_dir_if_exists(&previous_screenshots)?;
    let backup_screenshots = backup_dir.join("screenshots");
    let screenshot_files = if backup_screenshots.is_dir() {
        copy_dir_recursive(&backup_screenshots, &staged_screenshots)?
    } else {
        fs::create_dir_all(&staged_screenshots)
            .map_err(|error| format!("SCREENSHOT_STAGE_FAILED: {error}"))?;
        0
    };

    restore_database_file(&staged_database, &current_database, &previous_database)?;

    if current_screenshots.exists() {
        if let Err(error) = fs::rename(&current_screenshots, &previous_screenshots) {
            rollback_database(&current_database, &previous_database);
            let _ = remove_dir_if_exists(&staged_screenshots);
            return Err(format!("CURRENT_SCREENSHOTS_BACKUP_FAILED: {error}"));
        }
    }
    if let Err(error) = fs::rename(&staged_screenshots, &current_screenshots) {
        if previous_screenshots.exists() {
            let _ = fs::rename(&previous_screenshots, &current_screenshots);
        }
        rollback_database(&current_database, &previous_database);
        return Err(format!("SCREENSHOT_RESTORE_FAILED: {error}"));
    }

    remove_file_if_exists(&previous_database)?;
    remove_dir_if_exists(&previous_screenshots)?;
    Ok(JournalBackupResult {
        folder_path: backup_dir.to_string_lossy().to_string(),
        screenshot_files,
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
        tauri_plugin_sql::Migration {
            version: 9,
            description: "add_system_accounts_and_educators",
            sql: include_str!("../migrations/0009_system_accounts.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 10,
            description: "link_educators_to_strategies",
            sql: include_str!("../migrations/0010_educator_strategy.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 11,
            description: "add_backtest_workflow",
            sql: include_str!("../migrations/0011_backtest_workflow.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 12,
            description: "add_strategy_currency_pairs",
            sql: include_str!("../migrations/0012_strategy_currency_pairs.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 13,
            description: "link_educators_to_multiple_strategies",
            sql: include_str!("../migrations/0013_educator_strategies.sql"),
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
            capture_window_by_id,
            backup_journal,
            restore_journal
        ])
        .run(tauri::generate_context!())
        .expect("error while running MethodMark");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn minimized_windows_remain_available_for_capture_on_windows() {
        assert_eq!(
            capture_window_dimensions_are_usable(true, 160, 28),
            cfg!(target_os = "windows")
        );
        assert!(!capture_window_dimensions_are_usable(false, 160, 28));
        assert!(capture_window_dimensions_are_usable(false, 1280, 720));
    }

    #[test]
    fn backup_names_cannot_escape_the_selected_folder() {
        assert!(validate_backup_folder_name("MethodMark Backup 2026-07-14").is_ok());
        assert!(validate_backup_folder_name("../outside").is_err());
        assert!(validate_backup_folder_name("folder\\outside").is_err());
    }

    #[test]
    fn backup_only_accepts_official_or_dev_database_names() {
        assert!(validate_database_filename("trading-journal.db").is_ok());
        assert!(validate_database_filename("trading-journal-dev.db").is_ok());
        assert!(validate_database_filename("other.db").is_err());
    }

    #[test]
    fn screenshot_folder_copy_preserves_nested_files() {
        let id = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("trading-journal-backup-test-{id}"));
        let source = root.join("source");
        let destination = root.join("destination");
        fs::create_dir_all(source.join("2026-07-14")).expect("source folder");
        fs::write(source.join("2026-07-14").join("chart.png"), b"png").expect("source file");

        let copied = copy_dir_recursive(&source, &destination).expect("copy");

        assert_eq!(copied, 1);
        assert!(destination.join("2026-07-14").join("chart.png").is_file());
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn backup_location_cannot_be_inside_active_screenshots() {
        let root =
            std::env::temp_dir().join(format!("trading-journal-path-test-{}", std::process::id()));
        let screenshots = root.join("screenshots");
        let selected = screenshots.join("selected");
        fs::create_dir_all(&selected).expect("selected folder");

        let result = reject_path_inside_parent(
            &selected,
            &screenshots,
            "BACKUP_DESTINATION_INSIDE_SCREENSHOTS",
        );
        assert_eq!(
            result.expect_err("nested path must be rejected"),
            "BACKUP_DESTINATION_INSIDE_SCREENSHOTS"
        );

        fs::remove_dir_all(root).expect("cleanup");
    }
}
