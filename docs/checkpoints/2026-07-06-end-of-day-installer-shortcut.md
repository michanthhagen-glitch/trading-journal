# End Of Day Checkpoint - 2026-07-06

## Summary

Trading Journal is saved at an MVP checkpoint. The latest work added a Windows installer desktop shortcut and verified the production desktop build.

## What Changed

- Windows installer now creates `Trading Journal.lnk` on the current user's Desktop.
- Uninstall now removes that Desktop shortcut.
- The Tauri binary name is fixed to `Trading Journal` so the shortcut points at the expected exe.
- Tauri ownership notes mention the NSIS installer hook file.

## Files

- `src-tauri/tauri.conf.json`
- `src-tauri/windows/installer-hooks.nsh`
- `src-tauri/AGENTS.md`

## Verification

- `npm run check` passed.
- `npm run desktop:build` passed.
- Built app: `src-tauri/target/release/Trading Journal.exe`
- Built installer: `src-tauri/target/release/bundle/nsis/Trading Journal_0.1.0_x64-setup.exe`
- Local dev server on port `5173` was stopped for end of day.

## Next Steps

1. Set up the screenshot backup and restore flow before calling MVP fully ready.
2. Decide later whether to add code signing for friend testing.
3. Build macOS installer from macOS or CI when needed.
