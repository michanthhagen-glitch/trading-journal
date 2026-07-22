use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JournalBackupResult {
    folder_path: String,
    screenshot_files: u64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JournalBackupManifest {
    version: u32,
    app: String,
    database: String,
    created_at: String,
    screenshot_files: u64,
}

pub(crate) fn validate_database_filename(value: &str) -> Result<(), String> {
    match value {
        "trading-journal.db" | "trading-journal-dev.db" => Ok(()),
        _ => Err("BACKUP_DATABASE_NOT_ALLOWED".to_string()),
    }
}

pub(crate) fn validate_backup_folder_name(value: &str) -> Result<(), String> {
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

pub(crate) fn copy_dir_recursive(source: &Path, destination: &Path) -> Result<u64, String> {
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

pub(crate) fn reject_path_inside_parent(
    path: &Path,
    parent: &Path,
    error_code: &str,
) -> Result<(), String> {
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
pub(crate) fn backup_journal(
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
pub(crate) fn restore_journal(
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
