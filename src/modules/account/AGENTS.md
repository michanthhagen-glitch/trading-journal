# Account DOX

## Purpose

Owns account setup, strategy setup, and risk management setup.

## Ownership

- `AccountModule.tsx`: Accounts, Strategy, and Risk Management tabs.
- `EditAccountSetupDialog.tsx`: edit flows for accounts, strategies, and risk plans.
- `features/createAccountSetup/`: modal creation flows for account setup records, wrapped by the shared `ModalShell`.

## Local Contracts

- Live accounts require at least one strategy and one risk management plan.
- Demo accounts require at least one strategy; risk management is optional.
- Backtesting accounts require at least one strategy and no risk management plan.
- Accounts can connect multiple strategies and only one risk management plan.
- Account, Strategy, and Risk Management tabs stay list-first; creation opens modal dialogs.
- Account setup tabs use framed table-style lists aligned with Trades/List.
- Risk plan creation uses Risk and Goal tabs inside the modal.
- Account, Strategy, and Risk Management detail views own Edit and Delete actions.
- Deleting an account also deletes its trades, recaps, screenshot metadata, and physical screenshot files after confirmation.
- Linked strategies and risk plans must be unlinked before deletion.
- Commission is required but may be zero; risk values are required and must be greater than zero.
- Account, Strategy, and Risk Management rows open their detail view on double-click or Enter.
- Shared persistence goes through `src/shared/db/database.ts`.

## Verification

- Run `npm run check` after account module changes.

## Child DOX Index

- `features/AGENTS.md` - account feature subfolders.
