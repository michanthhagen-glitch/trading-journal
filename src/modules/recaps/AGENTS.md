# Recaps DOX

## Purpose

Owns daily, weekly, and monthly recap browsing.

## Ownership

- `RecapsModule.tsx`: cadence tabs and recap list.

## Local Contracts

- Recaps aggregate time periods.
- Per-trade recaps stay in Trades.
- Cadence values are `daily`, `weekly`, and `monthly`.
- Recaps filter by the selected sidebar account.
- Recap creation auto-fills period stats from trades and per-trade recap fields.
- Daily, weekly, and monthly recaps use a split `ModalShell`.
- Daily recap left pane lists trades; weekly lists days; monthly lists weeks.
- Recap period/title and auto stats live in the modal header above the split workspace.
- Existing daily, weekly, and monthly recap popups include a Delete action that removes only the saved time-bounded recap.
- Recap split panes scroll independently; left pane rows may grow downward and stack details so expanded rows stay readable.
- Daily recap titles are derived names like `Wednesday recap`, and daily trade rows use shared automatic trade names.
- Current recap and saved recap lists use compact table-style rows aligned with Trades/List.
- Mistake and done-well summaries are auto-imported from per-trade recap tags and repeated tags show counts.
- Weekly/monthly recap writing uses period review fields and score sliders; the rest is generated from trades and trade recaps.

## Work Guidance

- Keep tabs stable and visible.
- Add recap creation/editing here only for time-bounded recaps.
- Use `listJournalRecaps` or new shared DB helpers for data.

## Verification

- Run `npm run check` after recap changes.
- Run `npm run dev` for tab or layout changes.

## Child DOX Index

No child DOX files.
