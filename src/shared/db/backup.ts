import { isTauri, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  closeDatabase,
  databaseFilename,
  initializeDatabase,
} from "./database";

export type JournalBackupResult = {
  folderPath: string;
  screenshotFiles: number;
};

export function isJournalBackupAvailable() {
  return isTauri();
}

function backupFolderName() {
  const stamp = new Date()
    .toISOString()
    .replace("T", " ")
    .replace(/:/g, "-")
    .slice(0, 19);
  const appName = import.meta.env.VITE_APP_DISPLAY_NAME ?? "MethodMark";
  return `${appName} Backup ${stamp}`;
}

function readableBackupError(error: unknown) {
  const text = String(error);
  const messages: Array<[string, string]> = [
    ["JOURNAL_DATABASE_NOT_FOUND", "The journal database was not found."],
    ["BACKUP_FOLDER_ALREADY_EXISTS", "A backup with this name already exists."],
    [
      "BACKUP_DESTINATION_INSIDE_SCREENSHOTS",
      "Choose a folder outside the app's saved screenshots.",
    ],
    [
      "BACKUP_FOLDER_INSIDE_ACTIVE_SCREENSHOTS",
      "Choose a backup stored outside the app's saved screenshots.",
    ],
    ["BACKUP_MANIFEST_NOT_FOUND", "This folder is not a MethodMark backup."],
    ["BACKUP_MANIFEST_INVALID", "The backup information is damaged."],
    [
      "BACKUP_DOES_NOT_MATCH_THIS_APP",
      "This backup belongs to the other MethodMark app.",
    ],
    ["BACKUP_DATABASE_NOT_FOUND", "The backup database is missing."],
  ];
  return (
    messages.find(([code]) => text.includes(code))?.[1] ??
    "The backup operation could not be completed."
  );
}

export async function createJournalBackup(): Promise<JournalBackupResult | null> {
  if (!isTauri()) {
    throw new Error("Backup is available in the installed desktop app.");
  }
  const destination = await open({
    directory: true,
    multiple: false,
    title: "Choose where to save the MethodMark backup",
  });
  if (!destination || Array.isArray(destination)) return null;

  await closeDatabase();
  try {
    return await invoke<JournalBackupResult>("backup_journal", {
      destinationRoot: destination,
      folderName: backupFolderName(),
      dbFilename: databaseFilename(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    throw new Error(readableBackupError(error));
  } finally {
    await initializeDatabase();
  }
}

export async function restoreJournalBackup(): Promise<JournalBackupResult | null> {
  if (!isTauri()) {
    throw new Error("Restore is available in the installed desktop app.");
  }
  const backupFolder = await open({
    directory: true,
    multiple: false,
    title: "Choose a MethodMark backup folder",
  });
  if (!backupFolder || Array.isArray(backupFolder)) return null;

  await closeDatabase();
  try {
    return await invoke<JournalBackupResult>("restore_journal", {
      backupDir: backupFolder,
      dbFilename: databaseFilename(),
    });
  } catch (error) {
    await initializeDatabase();
    throw new Error(readableBackupError(error));
  }
}
