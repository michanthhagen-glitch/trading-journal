# Tests DOX

## Purpose

Owns Vitest tests for app behavior and project contracts.

## Ownership

- `appPreferences.test.ts`: shared app preference formatting and week-start behavior.
- `dashboardAnalytics.test.ts`: total, month, and week dashboard view-model calculations.
- `localDates.test.ts`: local-calendar arithmetic and month boundary behavior.
- `newTradeSubmission.test.ts`: new-trade validation and persisted payload assembly.
- `recapAnalysis.test.ts`: daily, weekly, and monthly recap period boundaries.
- `accountSetupValidation.test.ts`: commission and risk-plan safety rules.
- `moduleRegistry.test.ts`: smoke test for sidebar module registration.
- `screenshotTools.test.ts`: screenshot drop helper behavior.
- `strategyOptions.test.ts`: typed Strategy option inclusion, blank handling, and duplicate prevention.
- `strategyQueries.test.ts`: SQLite strategy reload coverage for reusable journaling choices.
- `tradeNames.test.ts`: automatic per-day trade display naming.
- `tradingPlan.test.ts`: sidebar trading plan milestones and rule counters.
- `tradeInstruments.test.ts`: instrument normalization, grouping, and price/pip/point/tick calculations.
- `tradeRecapWorkflow.test.ts`: Live/Demo versus System recap defaults, validation, and System execution-only save shape.
- `strategyWorkflow.test.ts`: educator multi-strategy merging and shared Fixed/RR/Custom trade target behavior.
- Strategy and instrument tests cover Fixed target validation and automatic 1R-through-goal calculations.

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
