# Tauri DOX

## Purpose

Owns the native desktop shell, Tauri configuration, native plugin registration, permissions, and SQLite migrations.

## Ownership

- `Cargo.toml`, `Cargo.lock`: Rust crate and Tauri plugin dependencies.
- `tauri.conf.json`: window, bundle, product, and app identity settings.
- `src/main.rs`, `src/lib.rs`: Tauri entry and plugin setup.
- `capabilities/default.json`: desktop permissions.
- `migrations/`: SQLite schema changes.
- `build.rs`: Tauri build hook.

## Local Contracts

- Register every SQL migration in `src/lib.rs` in version order.
- Any renderer feature that touches OS APIs needs matching permissions in `capabilities/default.json`.
- Keep database URL aligned with `src/shared/db/database.ts`: `sqlite:trading-journal.db`.
- Do not bypass renderer shared DB/storage contracts from UI code.
- Window capture commands live in `src/lib.rs` and are consumed through renderer storage helpers.
- The asset protocol is enabled only for `$APPDATA/screenshots/**` so saved screenshots can render in the UI.
- Windows NSIS installs create and remove a current-user desktop shortcut through `windows/installer-hooks.nsh`.

## Work Guidance

- Add Tauri plugins only when a real workflow needs them.
- Keep capabilities narrow and tied to the feature using them.
- Production icon generation is still pending; dev can run without the final icon set.

## Verification

- Run `npm run check` after config or migration edits.
- Run `npm run desktop:dev` when changing plugins, permissions, migrations, file access, dialogs, clipboard, or real SQLite behavior.
- Run `npm run desktop:build` before treating installer/bundle changes as done.

## Child DOX Index

- `migrations/AGENTS.md` - SQLite schema migration rules.
