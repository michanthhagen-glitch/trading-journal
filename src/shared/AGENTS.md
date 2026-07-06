# Shared DOX

## Purpose

Owns cross-module helpers and data access used by more than one module.

## Ownership

- `db/`: SQLite access, browser fallback data, screenshot file/blob storage.
- `appPreferences.ts`: persisted app preferences for date, time, timezone, week start, number format, currency display, and delete confirmation.
- `tradeNames.ts`: automatic per-day trade display names, such as `Trade 1`.

## Local Contracts

- Shared code must be genuinely reusable across modules.
- Do not move module-specific UI or workflow helpers here too early.
- Keep Tauri-specific APIs behind shared wrappers.

## Work Guidance

- Keep shared APIs typed.
- Prefer small, explicit helper functions over broad service objects.
- Keep browser fallback behavior aligned with desktop behavior.
- Trade names are derived display labels, not stored or editable fields.

## Verification

- Run `npm run check` after shared changes.
- Use `npm run desktop:dev` when native APIs are involved.

## Child DOX Index

- `db/AGENTS.md` - data access and screenshot storage.
