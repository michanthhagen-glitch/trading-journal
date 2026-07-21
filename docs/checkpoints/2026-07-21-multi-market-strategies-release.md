# MethodMark v0.1.6 - Multi-market strategies

## Saved progress

- Added grouped Strategy instruments for Forex Majors, Forex Minors, Forex Exotics, Metals, Indices, Energy, Crypto, and custom broker symbols.
- Added Price, Points, Pips, or Ticks as the global Settings preference for SL and TP input.
- Kept saved SL and TP values as prices while showing automatic unit conversions.
- Applied the instrument and unit flow to normal, System Account, and Backtesting trades.
- Allowed each educator to connect to multiple Strategies.
- Combined instruments and reusable conditions from all Strategies linked to a System Account educator.
- Added migrations `0012_strategy_currency_pairs.sql` and `0013_educator_strategies.sql` with legacy educator-link migration.

## Verification

- `npm run check` passed formatting, the production build, 9 test files, and 41 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml` passed 5 Rust tests.
- The complete migration chain was applied to an in-memory SQLite database and preserved the existing educator-to-strategy link.
- MethodMark Dev applied migration 13 to the real development database.
- Browser QA confirmed multiple Strategy checkboxes save and reopen for an educator.
- Browser QA confirmed the SL and TP preference persists after reload.

## Release

- Release version: `0.1.6`.
- Local Windows installer target: `src-tauri/target/release/bundle/nsis/MethodMark_0.1.6_x64-setup.exe`.
- Public release target: `v0.1.6` with signed Windows and macOS installers plus updater files.

## Next step

- User-test the new Strategy, educator, System Account, and Backtesting flows in MethodMark Dev and report polish requests separately.
