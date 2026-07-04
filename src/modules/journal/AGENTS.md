# Journal DOX

## Purpose

Owns daily, weekly, and monthly recap browsing.

## Ownership

- `JournalModule.tsx`: cadence tabs and recap list.

## Local Contracts

- Journal recaps aggregate time periods.
- Per-trade recaps stay in Trades.
- Cadence values are `daily`, `weekly`, and `monthly`.
- Journal recaps filter by the selected top-bar account.

## Work Guidance

- Keep tabs stable and visible.
- Add recap creation/editing here only for time-bounded journal recaps.
- Use `listJournalRecaps` or new shared DB helpers for data.

## Verification

- Run `npm run check` after journal changes.
- Run `npm run dev` for tab or layout changes.

## Child DOX Index

No child DOX files.
