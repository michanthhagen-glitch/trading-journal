# Create Account Setup DOX

## Purpose

Owns modal creation flows for accounts, strategies, and risk management plans.

## Ownership

- `CreateAccountSetupDialogs.tsx`: account, strategy, and risk plan create forms plus shared create-modal wrapper.

## Local Contracts

- Creation dialogs use the shared `ModalShell` through `CreateModalShell`.
- Risk plan creation keeps Risk and Goal tabs visible inside the modal.
- Account creation must respect account type rules from the Account module.
- Dialog save handlers call the typed shared DB helpers passed from the account flow.

## Work Guidance

- Keep validation messages local and plain.
- Do not add edit/detail behavior here; this folder is for creation flows.

## Verification

- Run `npm run check` after dialog changes.
- Run `npm run dev` for modal layout changes.

## Child DOX Index

No child DOX files.
