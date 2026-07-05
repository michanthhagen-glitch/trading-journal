# Recaps DOX

## Purpose

Owns daily, weekly, and monthly recap browsing.

## Ownership

- `RecapsModule.tsx`: cadence tabs and recap list.

## Local Contracts

- Recaps aggregate time periods.
- Per-trade recaps stay in Trades.
- Cadence values are `daily`, `weekly`, and `monthly`.
- Recaps filter by the selected top-bar account.
- Recap creation auto-fills period stats from trades and per-trade recap fields.
- Daily, weekly, and monthly recaps use the same compact create/edit modal through the shared `ModalShell`.
- Current recap and saved recap lists use compact table-style rows aligned with Trades/List.
- Recap writing should stay limited to mistakes made, what went well, and what could be done better; the rest is generated from trades and trade recaps.

## Work Guidance

- Keep tabs stable and visible.
- Add recap creation/editing here only for time-bounded recaps.
- Use `listJournalRecaps` or new shared DB helpers for data.

## Verification

- Run `npm run check` after recap changes.
- Run `npm run dev` for tab or layout changes.

## Child DOX Index

No child DOX files.
