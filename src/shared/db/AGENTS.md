# Shared DB DOX

## Purpose

Owns the renderer-side data API, SQLite bridge, browser fallback data, and screenshot storage helpers.

## Ownership

- `database.ts`: types, SQLite connection, trade workflow APIs, recap APIs, screenshot metadata APIs, browser fallback seeds.
- `strategyQueries.ts`: account-setup strategy query, including reusable journaling-choice columns.
- `accountSetupValidation.ts`: shared account, strategy, educator, commission, and risk-plan validation.
- `backup.ts`: typed desktop backup/restore wrapper and folder picker flow.
- `storage.ts`: screenshot bytes, clipboard import, file import, window capture, URL resolution, physical file deletion.

## Local Contracts

- Official desktop mode uses `sqlite:trading-journal.db` through `@tauri-apps/plugin-sql`; dev-app mode uses `sqlite:trading-journal-dev.db`.
- Browser mode uses in-memory trades and blob URLs so `npm run dev` works without Tauri.
- Components must not import `@tauri-apps/plugin-sql` or `@tauri-apps/plugin-fs` directly.
- Native window capture must stay behind `storage.ts`; components should call the typed helper functions.
- Schema changes require a new SQL migration in `src-tauri/migrations` and registration in `src-tauri/src/lib.rs`.
- Trade workflow fields include reusable key-level and entry/exit-condition selections alongside the existing planning, entry, and exit data.
- Backtesting trades also store a session id, date of backtesting, and flexible TP/result scenarios.
- Strategy setup fields include strategy text, rules, and reusable key-level, entry-condition, and exit-condition option lists.
- Educator setup fields include educator name, community, notes, and an optional linked strategy.
- Risk management setup fields include per-trade/day/week risk ranges, trade-loss limits, and daily/weekly goal ranges.
- Commission is required and may be zero; every risk-plan value is required and must be greater than zero.
- Account, strategy, and risk-plan editing and deletion go through typed database APIs. Linked strategies and risk plans cannot be deleted until unlinked.
- System Accounts link educators instead of strategies; linked educators cannot be deleted until unlinked.
- Trades and time-bounded recaps belong to the selected sidebar account through `account_id`.
- Saving a per-trade recap marks that trade as reviewed.
- Per-trade recaps store structured fields for later daily, weekly, and monthly automation.
- The Recaps module uses shared save/list helpers and keeps browser fallback aligned with SQLite.
- Time-bounded recap delete uses `deleteJournalRecap`; it removes only the `journal_recaps` row.
- Screenshot backup/restore must treat the active database file and the `screenshots/` folder as one data set; database-only export is incomplete once screenshots exist.
- Backup/restore must keep official and dev-app data separate by accepting only the active build's exact database filename.

## Work Guidance

- Keep public API functions async, even when browser fallback is synchronous.
- Update TypeScript row types when migrations add columns.
- Keep fallback seed data realistic but small.
- Keep weekly/monthly browser recap seeds empty unless the product deliberately needs demo history.
- Avoid circular imports between `database.ts` and `storage.ts`.

## Verification

- Run `npm run check` after data API changes.
- Run `npm run desktop:dev` for real SQLite, filesystem, dialog, or clipboard changes.
- Before MVP release, verify screenshot backup/restore in the Tauri desktop app with real screenshot files.

## Child DOX Index

No child DOX files.
