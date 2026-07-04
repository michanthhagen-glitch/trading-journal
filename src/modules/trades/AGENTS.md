# Trades DOX

## Purpose

Owns trade logging, trade list, trade detail, pre-trade planning, entry details, exit details, and trade screenshots.

## Ownership

- `TradesModule.tsx`: trade table, selected trade detail, three-card new trade workflow, entry form, exit form.
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
- New trades save under the selected top-bar account.
- New trade strategy choices come only from the selected account's linked strategies.
- New trade risk % is checked against the selected account's risk plan without editing the plan.
- Saved trade cards expose screenshot import for `pre-trade`, `entry`, and `exit`.
- Screenshot buttons try TradingView capture first, then a window selector, then file import fallback.
- The trade list stays compact and shows date, time, buy/sell, strategy, result, P&L, and growth %.
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

No child DOX files.
