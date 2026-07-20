# System Accounts, Backtesting, and Screenshot Capture - 2026-07-20

## Saved Progress

- Added System Accounts for community or educator-led trades.
- Added educator setup, optional strategy links, and educator selection in System Account trades.
- Added a simplified System Account trade workflow with Entry, Exit, screenshots, and notes.
- Added Backtesting account sessions, rapid trade logging, flexible targets/results, RR calculations, strategy conditions, and a dedicated dashboard.
- Added reusable strategy key levels, entry conditions, and exit conditions across journaling workflows.
- Fixed strategy option persistence and reload from SQLite.
- Added live TradingView capture, an app/window selector fallback, and saved-file fallback to all new-trade workflows.
- Kept saved-trade editing limited to image selection or drag and drop.

## Key Decisions

- Reused the existing trade and screenshot storage where possible so normal, System, and Backtesting trades remain compatible with the same journal.
- Backtesting before/after images map to the existing pre-trade/exit screenshot stages.
- System Accounts use educators as their trade source instead of account strategies.
- TradingView capture temporarily restores a minimized window, captures it, restores its minimized state, and returns focus to the previous app.

## Verification

- `npm run check` passed: formatting, TypeScript, production build, and 30 Vitest tests.
- `cargo test --manifest-path src-tauri/Cargo.toml` passed: 5 Rust tests.
- A native diagnostic captured a real minimized TradingView window and confirmed it was minimized again afterward.
- `git diff --check` passed.
- The MethodMark Dev desktop app remained healthy during live testing.

## Next Step

- User test the complete flow in MethodMark Dev and record any polish requests as a separate follow-up.
