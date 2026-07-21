# Tests DOX

## Purpose

Owns Vitest tests for app behavior and project contracts.

## Ownership

- `appPreferences.test.ts`: shared app preference formatting and week-start behavior.
- `accountSetupValidation.test.ts`: commission and risk-plan safety rules.
- `moduleRegistry.test.ts`: smoke test for sidebar module registration.
- `screenshotTools.test.ts`: screenshot drop helper behavior.
- `strategyQueries.test.ts`: SQLite strategy reload coverage for reusable journaling choices.
- `tradeNames.test.ts`: automatic per-day trade display naming.
- `tradingPlan.test.ts`: sidebar trading plan milestones and rule counters.
- `tradeInstruments.test.ts`: instrument normalization, grouping, and price/pip/point/tick calculations.

## Local Contracts

- Tests should protect real contracts, not implementation trivia.
- Keep fast unit tests here.
- Browser or desktop smoke checks can be manual until a browser test framework exists.

## Work Guidance

- Add focused tests when changing shared data helpers, registry behavior, or pure logic.
- Keep test names plain and behavior-based.
- Do not make tests depend on Tauri runtime unless the test setup explicitly supports it.

## Verification

- Run `npm run test` for tests only.
- Run `npm run check` before closeout.

## Child DOX Index

No child DOX files.
