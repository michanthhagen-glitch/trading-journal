mod backup;
mod capture;
mod migrations;

use backup::{backup_journal, restore_journal};
use capture::{capture_tradingview_window, capture_window_by_id, list_capture_windows};
use migrations::{sql_migrations, DEV_DB_URL, OFFICIAL_DB_URL};

#[cfg(test)]
use backup::{
    copy_dir_recursive, reject_path_inside_parent, validate_backup_folder_name,
    validate_database_filename,
};
#[cfg(test)]
use capture::capture_window_dimensions_are_usable;
#[cfg(test)]
use std::fs;

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
