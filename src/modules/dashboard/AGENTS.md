# Dashboard DOX

## Purpose

Owns the performance overview: KPIs, equity curve placeholder, and recent activity.

## Ownership

- `DashboardModule.tsx`: dashboard layout, KPI cards, and mock activity data.

## Local Contracts

- Dashboard metrics read selected-account trades through shared data helpers.
- Balance and growth are derived from the selected account starting balance plus closed/open trade P&L.
- Real charts should connect through shared data helpers, not inline Tauri APIs.
- Keep the view scan-friendly and compact.

## Work Guidance

- Replace placeholders with real data only when the source query exists in `src/shared/db`.
- Keep chart-heavy detail secondary to the high-level summary.
- Do not add a new analytics module here unless the sidebar registry changes intentionally.

## Verification

- Run `npm run check` after dashboard changes.
- Run `npm run dev` when chart or layout behavior changes.

## Child DOX Index

No child DOX files.
