# Screenshot Backup Requirement - 2026-07-06

## Summary

Before calling the MVP ready, Trading Journal needs a clear backup and restore path that protects screenshots.

## Requirement

- Backup/export must include both `trading-journal.db` and the full `screenshots/` folder.
- Restore/import must restore both together so screenshot rows still point to real image files.
- The app should not treat database-only export as a complete backup once screenshots are in use.
- Desktop verification must use the Tauri app, not only browser dev mode, because browser mode stores screenshots only as temporary blob URLs.

## Current Storage Shape

- Screenshot files are stored under Tauri `AppData`, currently `screenshots/YYYY-MM-DD/<id>.png`.
- The SQLite `screenshots` table stores the relative file path.
- On Windows, the app data base resolves under the installed user's roaming app data folder for `com.mykey.tradingjournal`.

## MVP Exit Check

1. Add a Settings/Data backup flow or an equivalent documented backup command.
2. Confirm export includes the SQLite database and screenshot folder.
3. Confirm restore on a clean user profile opens trades and displays restored screenshot thumbnails.
4. Confirm delete flows keep database rows and physical screenshot files in sync.
