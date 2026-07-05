# Shared DOX

## Purpose

Owns cross-module helpers and data access used by more than one module.

## Ownership

- `db/`: SQLite access, browser fallback data, screenshot file/blob storage.
- `appPreferences.ts`: persisted app preferences for date, time, timezone, week start, number format, currency display, and delete confirmation.

## Local Contracts

- Shared code must be genuinely reusable across modules.
- Do not move module-specific UI or workflow helpers here too early.
- Keep Tauri-specific APIs behind shared wrappers.

## Work Guidance

- Keep shared APIs typed.
- Prefer small, explicit helper functions over broad service objects.
- Keep browser fallback behavior aligned with desktop behavior.

## Verification

- Run `npm run check` after shared changes.
- Use `npm run desktop:dev` when native APIs are involved.

## Child DOX Index

- `db/AGENTS.md` - data access and screenshot storage.
