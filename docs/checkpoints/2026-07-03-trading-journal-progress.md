# Trading Journal Progress - 2026-07-03

## Status

Initial project stage is saved and ready to continue.

## What Exists

- Desktop Trading Journal app using React, Vite, Tauri, and SQLite.
- Main shell with sidebar modules and a top-bar account picker.
- Trade workflow with Pre-trade, Entry, and Exit cards.
- Screenshot capture/import flow with TradingView as the preferred source.
- Account module with Accounts, Strategy, and Risk Management tabs.
- Account-linked strategy and risk plan selection.
- Dashboard and trades are connected to the selected account context.

## Important Decisions

- The selected account in the top bar controls trades, journal, and dashboard data.
- Strategies and risk plans should be protected records.
- The account can be used for testing, but real strategy and risk management data should stay safe.
- Trade recaps are separate from trade entry and should come later.

## Checks

- `npm run check` passed.
- `cargo check` passed.

## Next Steps

1. Dogfood the account picker with the real account.
2. Confirm trades save under the selected account.
3. Add account balance before and after trade into the trade detail header.
4. Improve account growth and RR calculations from real trade/account data.
5. Build the journal recap flow connected to the selected account.
6. Add edit/detail flows where needed for accounts, strategies, and risk plans.
