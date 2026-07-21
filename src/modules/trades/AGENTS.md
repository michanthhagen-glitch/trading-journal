# Trades DOX

## Purpose

Owns trade logging, trade list, trade detail, pre-trade planning, entry details, exit details, and trade screenshots.

## Ownership

- `TradesModule.tsx`: trade table, selected trade detail, standard three-card workflow, simplified System Account workflow, and saved-stage editors.
- `components/BacktestWorkflow.tsx`: Backtest Session setup and rapid multi-target trade logger.
- `tradeRecapMistakes.ts`: categorized starter catalog for trade recap mistake tags.
- `tradeRecapPositives.ts`: categorized starter catalog for trade recap positive tags.
- `components/PreTradeCard.tsx`: pre-trade summary and screenshot gallery.
- `components/PreTradeForm.tsx`: pre-trade editor, screenshot import, clipboard paste.
- `components/ScreenshotTools.tsx`: reusable screenshot import and gallery controls for saved and draft trade screenshots.

## Local Contracts

- Trade stages are `pre-trade`, `open`, `closed`, and `reviewed`.
- Direction belongs to the Entry stage in the UI, even though it is stored on the trade row.
- Entry time defaults to the current local time when starting a new trade or filling an empty entry.
- Lot size belongs to the Entry stage and maps to the existing `entry_size` column.
- Exit time belongs to the Exit stage and is saved with the exit details.
- Screenshot stages are `pre-trade`, `entry`, `exit`, and `recap`.
- New trade workflow can collect draft screenshots and attaches them after the trade is saved.
- New trades save under the selected sidebar account.
- Trade save/delete/exit changes notify the shell so sidebar account plan numbers refresh.
- Trade display names are automatic per selected account and day: `Trade 1`, `Trade 2`, etc.; the instrument is not the trade name.
- New trade strategy choices come only from the selected account's linked strategies.
- New System Account trades use linked educators in the same saved trade-source field and label it Educator.
- System Account trades use an Entry + Exit workflow only. Date, instrument, and educator belong to the Entry card; pre-trade planning, risk fields, confidence, and feelings are omitted.
- System Account screenshots and notes stay attached to their Entry or Exit stage, and saved trade details and recap context omit the Pre-trade card.
- Backtesting starts a session with strategy, instrument, and date of backtesting, then keeps those values while rapidly saving trades.
- Normal and Backtesting instrument selectors use the instruments saved on the linked Strategy and group them by market.
- System Account instrument and condition selectors combine the options from all Strategies linked to the selected educator.
- Backtesting trade logging includes historical date/time, buy/sell, entry, SL, flexible TP/result rows, calculated RR, strategy selectors, and before/after screenshots.
- Backtesting trades do not raise missing-recap or open-trade reminders.
- Strategy key-level, entry-condition, and exit-condition choices are available in normal, System Account, and Backtesting trade workflows.
- New trade risk % is checked against the selected account's risk plan without editing the plan.
- Saved trade cards expose screenshot import for `pre-trade`, `entry`, and `exit`.
- Screenshot buttons try TradingView capture first, then a window selector, then file import fallback.
- Trades opens on the Calendar tab by default; the List tab groups trades by collapsible weeks.
- Calendar days show only day totals; double-click a populated day to open that day's trades.
- Missing per-trade recaps show a small warning on calendar days, weekly groups, and trade rows.
- Calendar day detail and list rows can create a missing per-trade recap.
- Per-trade recap creation collects structured automation fields: grade, plan follow, quality scores, mistake tags, positive tags, emotion, rule-broken, lesson, and next action.
- Recap mistake tags start from `tradeRecapMistakes.ts`; keep the catalog grouped even if the UI later flattens it.
- Recap positive tags start from `tradeRecapPositives.ts`; keep the catalog grouped even if the UI later flattens it.
- Recap quick tag buttons use quick exports from the catalog files, not duplicate local arrays.
- Recap lesson and next action fields use quick options plus free text so journaling stays fast.
- Trade rows open a shared trade workspace modal instead of a separate full-page detail view.
- Global search can switch to Trades/List and open a specific trade in the shared workspace modal.
- The shared trade workspace has two modes: trade mode gives trade details the wide side and recap summary the narrow side; recap mode gives trade context the narrow side and recap editing the wide side.
- Trade mode shows the trade summary metrics in the modal header, above the split workspace body.
- Create and Done recap actions both open the shared trade workspace in recap mode.
- Recap modal trade details show saved pre-trade, entry, and exit screenshot thumbnails when available.
- Recap tabs navigate Mistakes, Done Well, Lesson, and Score.
- Trade popups use the shared `ModalShell` for popup chrome, including the trade workspace, day details, trade workflow, entry/exit forms, pre-trade, and screenshot previews.
- The trade list stays compact and shows date/time, buy/sell, strategy or educator, result, P&L, and growth %.
- Recaps are separate from the pre-trade, entry, and exit workflow.
- All persistence must use `src/shared/db/database.ts` and `src/shared/db/storage.ts`.

## Work Guidance

- Keep the list flat and fast to scan.
- Open a row for per-trade detail instead of crowding the table.
- Keep new, entry, exit, and pre-trade forms close to the trade workflow until another module needs them.
- When deleting screenshot metadata, handle physical file cleanup deliberately; current DB deletion does not remove the file.

## Verification

- Run `npm run check` after trades changes.
- Run `npm run dev` for browser fallback behavior.
- Use `npm run desktop:dev` when testing clipboard, dialog, filesystem, or real SQLite behavior.

## Child DOX Index

- `components/AGENTS.md` - module-local trade UI components.
