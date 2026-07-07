# Tauri DOX

## Purpose

Owns the native desktop shell, Tauri configuration, native plugin registration, permissions, and SQLite migrations.

## Ownership

- `Cargo.toml`, `Cargo.lock`: Rust crate and Tauri plugin dependencies.
- `tauri.conf.json`, `tauri.dev.conf.json`, `tauri.macos.conf.json`: official, dev-app, and macOS release bundle settings.
- `src/main.rs`, `src/lib.rs`: Tauri entry and plugin setup.
- `capabilities/default.json`: desktop permissions.
- `migrations/`: SQLite schema changes.
- `build.rs`: Tauri build hook.
- `windows/installer-hooks*.nsh`: Windows shortcut installer hooks.

## Local Contracts

- Register every SQL migration in `src/lib.rs` in version order.
- Any renderer feature that touches OS APIs needs matching permissions in `capabilities/default.json`.
- Keep database URLs aligned with `src/shared/db/database.ts`: official uses `sqlite:trading-journal.db`, dev app uses `sqlite:trading-journal-dev.db`.
- Do not bypass renderer shared DB/storage contracts from UI code.
- Window capture commands live in `src/lib.rs` and are consumed through renderer storage helpers.
- The asset protocol is enabled only for `$APPDATA/screenshots/**` so saved screenshots can render in the UI.
- Windows NSIS installs create and remove current-user desktop shortcuts through `windows/installer-hooks.nsh` for official builds and `windows/installer-hooks-dev.nsh` for dev-app builds; the official hook also labels the install-folder picker.
- macOS release builds use `tauri.macos.conf.json` to produce a DMG without changing the Windows NSIS default.

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
