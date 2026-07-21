# Settings DOX

## Purpose

Owns preferences and data-management UI.

## Ownership

- `SettingsModule.tsx`: general preferences plus desktop data backup and restore.

## Local Contracts

- Any real setting must have a storage plan before adding UI controls.
- Settings uses a module-local sidebar; put broad groups like General, Data, or Appearance there.
- The settings sidebar and active settings content own the workspace directly; avoid extra active-section title headers.
- General app preferences are saved in local browser storage through `src/shared/appPreferences.ts`.
- The global SL and TP input preference supports Price, Points, Pips, or Ticks while saved targets remain prices.
- Data import/export belongs here unless a more specific module owns the workflow.
- Data backup/export must include both the SQLite database and screenshot files so restored trades do not lose chart images.
- Backup and restore are desktop-only, use a user-selected folder, and reload the app after a successful restore.
- Restore always requires confirmation and rejects backups from the other app identity.

## Work Guidance

- Keep settings grouped by task, not by implementation detail.
- Do not add a theme toggle until the CSS variables and persistence are ready.
- Prefer clear destructive-action safeguards for backup, restore, or delete flows.
- Treat database-only export as partial once screenshots exist; label it clearly or include screenshot files.

## Verification

- Run `npm run check` after settings changes.
- Run `npm run dev` for layout changes.

## Child DOX Index

No child DOX files.
