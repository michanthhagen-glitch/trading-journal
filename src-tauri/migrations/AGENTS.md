# Migrations DOX

## Purpose

Owns SQLite schema migration files for the desktop database.

## Ownership

- `0001_initial.sql`: initial trades, recaps, and journal_recaps tables.
- `0002_pretrade.sql`: pre-trade fields and screenshots table.
- `0003_trade_workflow.sql`: pre-trade, entry, and exit workflow fields.
- `0004_accounts.sql`: accounts, strategies, risk management plans, and account-strategy links.
- `0005_strategy_rules.sql`: strategy rule detail fields.
- `0006_risk_plan_limits.sql`: risk limits, trade limits, and goal fields.
- `0007_account_context.sql`: account assignment for trades and journal recaps.

## Local Contracts

- Name files `NNNN_description.sql`.
- Register every migration in `src-tauri/src/lib.rs`.
- Migrations must be ordered by version and safe for existing local data.
- Keep TypeScript row types in `src/shared/db/database.ts` aligned with schema changes.

## Work Guidance

- Prefer additive migrations for local desktop data.
- Add indexes when new queries need them.
- Keep comments short and useful.

## Verification

- Run `npm run check` after migration changes.
- Run `npm run desktop:dev` to verify real migration behavior.

## Child DOX Index

No child DOX files.
