# Dashboard DOX

## Purpose

Owns the compact account control room: total/month/week summaries, risk/goal readouts, result rings, history visuals, and dashboard detail tabs.

## Ownership

- `DashboardModule.tsx`: total/month/week summary cards, dashboard tabs, graphs, and detail modals that use the shared `ModalShell`.

## Local Contracts

- Dashboard metrics read selected-account trades through shared data helpers.
- Trade ranking labels use shared automatic trade names; the instrument remains a statistics grouping, not the trade name.
- Balance and growth are derived from the selected account starting balance plus closed/open trade P&L.
- The top dashboard area should show Total, Current Month, and Current Week as compact side-by-side summary cards when width allows.
- Top summary cards may use roughly 35% of the visible workspace height when the extra room improves readability.
- Top summary cards use result tiles for last 10 trades/months/weeks; keep graph-style visuals in the lower detail tabs.
- In top summary cards, keep best/worst rate or weekly risk details in the upper insight area, and place result rings directly above the last-10 tiles.
- Worst win rate means the lowest win percentage, not the highest loss percentage.
- Top summary rings reveal segment values on hover or focus instead of showing permanent legends below the ring.
- Dashboard detail content belongs in tabs below the summary bands.
- Lower dashboard detail uses a responsive desktop layout: daily-balance line graph on the left at about one-third width, top winning/losing trade/day/week/month rankings on the right at about two-thirds width.
- The default dashboard should keep the visible top gap above the summary cards and bottom gap below the lower workspace even.
- The Statistics tab groups all closed trades by day, session, time of day, direction, instrument, and strategy or educator; six cards should sit as three columns by two rows on desktop.
- Statistics cards compare best/worst win rate where useful; Direction compares Long and Short directly, while Strategy can stay as a simple top-result card to avoid cramped names.
- Statistics detail popups use Table and Chart tabs; Day detail must always show Monday through Sunday, including days with zero trades.
- Direction detail must always show Long and Short rows.
- Session detail must always show Tokyo, Tokyo-London, London, London/New York, New York, and New York-Tokyo buckets.
- Time detail must always show 15-minute buckets from `00:00-00:15` through `23:45-00:00`.
- Instrument detail grows automatically from instruments used on trades.
- Strategy detail must include every created strategy, with unused strategies shown as zero-trade rows.
- System Account source statistics are labeled Educator and include every created educator.
- Backtesting accounts replace balance-period summaries with testing metrics: sample size, sessions, win rate, total R, average RR, and maximum loss streak.
- Backtesting performance is compared by strategy, target number, key level, entry condition, and exit condition.
- Statistics detail table popups should shrink around the table content without empty right-side space; chart views should stay capped so they do not over-expand.
- Statistics chart bars should keep Loss centered between Win and BE, with only total trades visible by default; per-result counts belong on hover.
- Daily-balance charts include the starting balance point, a dotted starting-balance level line, balance grid labels, day ticks, per-dot P&L hover details, and growth in the footer.
- Daily-balance history fills quiet calendar days through today by carrying forward the last balance, and shows tomorrow as a tick-only placeholder until local midnight.
- Dashboard current month/week calculations refresh at local midnight while the app stays open.
- The lower Total tab daily-balance chart shows all account history from the first logged trade through today, with tomorrow as a tick-only placeholder.
- The lower Month tab daily-balance chart shows the current month; double-click opens year tabs with month-by-month chart history from first trade month through the current month.
- The lower Week tab daily-balance chart shows the current Monday-to-Sunday week, labels ticks as `M T W T F S S`, double-click opens year tabs with saved week summary list rows, and week rows open a deeper week graph.
- The default dashboard page should fit the visible desktop workspace without whole-page scrolling; keep lower chart and ranking cards compact, with deeper lists available through detail popups.
- The chart history detail view should fit four monthly charts per row on desktop, so a full year is visible as three rows.
- The Total daily-balance chart uses account-scale bounds: starting balance sits at one-third of the value range, with the top at 200% growth, then 300%, 400%, etc. when exceeded.
- The dashboard should stay compact, summary-first, and warning-oriented.
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
