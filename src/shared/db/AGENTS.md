# Shared DB DOX

## Purpose

Owns the renderer-side data API, SQLite bridge, browser fallback data, and screenshot storage helpers.

## Ownership

- `database.ts`: types, SQLite connection, trade workflow APIs, recap APIs, screenshot metadata APIs, browser fallback seeds.
- `storage.ts`: screenshot bytes, clipboard import, file import, window capture, URL resolution, physical file deletion.

## Local Contracts

- Desktop mode uses `sqlite:trading-journal.db` through `@tauri-apps/plugin-sql`.
- Browser mode uses in-memory trades and blob URLs so `npm run dev` works without Tauri.
- Components must not import `@tauri-apps/plugin-sql` or `@tauri-apps/plugin-fs` directly.
- Native window capture must stay behind `storage.ts`; components should call the typed helper functions.
- Schema changes require a new SQL migration in `src-tauri/migrations` and registration in `src-tauri/src/lib.rs`.
- Trade workflow fields include pre-trade strategy/risk, entry direction/time/price/lot size/SL/TP/notes/confidence, and exit time/price/result/P&L/note/feeling.
- Strategy setup fields include strategy text, entry rules, SL/TP rules, and invalidation rules.
- Risk management setup fields include per-trade/day/week risk ranges, trade-loss limits, and daily/weekly goal ranges.
- Trades and time-bounded recaps belong to the selected top-bar account through `account_id`.
- Saving a per-trade recap marks that trade as reviewed.
- Per-trade recaps store structured fields for later daily, weekly, and monthly automation.
- The Recaps module uses shared save/list helpers and keeps browser fallback aligned with SQLite.

## Work Guidance

- Keep public API functions async, even when browser fallback is synchronous.
- Update TypeScript row types when migrations add columns.
- Keep fallback seed data realistic but small.
- Avoid circular imports between `database.ts` and `storage.ts`.

## Verification

- Run `npm run check` after data API changes.
- Run `npm run desktop:dev` for real SQLite, filesystem, dialog, or clipboard changes.

## Child DOX Index

No child DOX files.
