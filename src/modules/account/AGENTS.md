# Account DOX

## Purpose

Owns account setup, strategy setup, educator setup, and risk management setup.

## Ownership

- `AccountModule.tsx`: Accounts, Strategy, Educators, and Risk Management tabs.
- `StrategyOptionListField.tsx`: add/remove editor for reusable Strategy journal choices.
- `StrategyInstrumentField.tsx`: grouped instrument library and custom broker-symbol selector for Strategies.
- `EditAccountSetupDialog.tsx`: edit flows for accounts, strategies, educators, and risk plans.
- `features/createAccountSetup/`: modal creation flows for account setup records, wrapped by the shared `ModalShell`.

## Local Contracts

- Live accounts require at least one strategy and one risk management plan.
- Demo accounts require at least one strategy; risk management is optional.
- Backtesting accounts require at least one strategy and no risk management plan.
- System Accounts require at least one educator and use educators instead of strategies.
- Accounts can connect multiple strategies and only one risk management plan.
- System Accounts can connect multiple educators.
- Each educator can optionally connect to multiple existing strategies.
- Strategies own reusable key-level, entry-condition, and exit-condition choices that appear in journaling workflows.
- Strategies own their trading instruments, organized as Forex Majors, Forex Minors, Forex Exotics, Metals, Indices, Energy, Crypto, or custom broker symbols.
- Account, Strategy, Educators, and Risk Management tabs stay list-first; creation opens modal dialogs.
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
