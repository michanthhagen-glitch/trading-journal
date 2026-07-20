# Create Account Setup DOX

## Purpose

Owns modal creation flows for accounts, strategies, educators, and risk management plans.

## Ownership

- `CreateAccountSetupDialogs.tsx`: account, strategy, educator, and risk plan create forms plus shared create-modal wrapper.

## Local Contracts

- Creation dialogs use the shared `ModalShell` through `CreateModalShell`.
- Risk plan creation keeps Risk and Goal tabs visible inside the modal.
- Account creation must respect account type rules from the Account module.
- System Account creation shows educator selection instead of strategy selection.
- Educator creation can link the educator to one existing strategy.
- Strategy creation supports add/remove lists for key levels, entry conditions, and exit conditions.
- Dialog save handlers call the typed shared DB helpers passed from the account flow.

## Work Guidance

- Keep validation messages local and plain.
- Do not add edit/detail behavior here; this folder is for creation flows.

## Verification

- Run `npm run check` after dialog changes.
- Run `npm run dev` for modal layout changes.

## Child DOX Index

No child DOX files.
