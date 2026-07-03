# Account DOX

## Purpose

Owns account setup, strategy setup, and risk management setup.

## Ownership

- `AccountWorkspace.tsx`: Accounts, Strategy, and Risk Management tabs.
- `features/createAccountSetup/`: modal creation flows for account setup records.

## Local Contracts

- Live accounts require at least one strategy and one risk management plan.
- Demo accounts require at least one strategy; risk management is optional.
- Backtesting accounts require at least one strategy and no risk management plan.
- Accounts can connect multiple strategies and only one risk management plan.
- Account, Strategy, and Risk Management tabs stay list-first; creation opens modal dialogs.
- Risk plan creation uses Risk and Goal tabs inside the modal.
- Account cards open their detail view on double-click.
- Shared persistence goes through `src/shared/db/database.ts`.

## Verification

- Run `npm run check` after account module changes.
