# MethodMark v0.1.7 - Strategy target plans

## Saved progress

- Added Fixed, Risk / Reward, and Custom target plans to Strategies.
- Fixed plans save one SL and multiple TPs using the selected Settings unit, then lock those values in trade workflows.
- Risk / Reward plans use the workflow SL to calculate every whole-number target through the goal, such as 1:1, 1:2, and 1:3.
- Custom plans allow manual SL and multiple TP entry inside each workflow.
- Applied target plans to normal trades, System Accounts, educators linked to multiple Strategies, and Backtesting.
- Added migration `0014_strategy_target_plans.sql` for Strategy plans and stored trade TP arrays.
- Preserved the last TP as the legacy main target while saving every planned TP.

## Key decisions

- Fixed target values keep the Settings unit selected when the Strategy is saved.
- Educators with multiple linked Strategies reuse a plan only when every linked Strategy has the same target plan; mixed plans fall back to Custom.
- Existing Strategies migrate safely to Custom.

## Verification

- `npm run check` passed formatting, the production build, 9 test files, and 45 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml` passed 5 Rust tests.
- `npm run desktop:build` produced the official Windows installer successfully.
- MethodMark Dev applied migration 14 to the real development database.
- Browser QA confirmed Fixed, Risk / Reward, and Custom workflows with no console errors.

## Release

- Release version: `0.1.7`.
- Local Windows installer: `src-tauri/target/release/bundle/nsis/MethodMark_0.1.7_x64-setup.exe`.
- Public release target: `v0.1.7` with signed Windows and macOS installers plus updater files.

## Next step

- Continue user testing from this stronger Strategy and trade-planning baseline.
