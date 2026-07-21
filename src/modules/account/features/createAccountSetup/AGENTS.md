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
- Educator creation can link the educator to multiple existing strategies.
- Strategy creation supports add/remove lists for key levels, entry conditions, and exit conditions.
- Strategy creation selects trading instruments from the grouped library and can add custom broker symbols.
- Strategy creation selects Fixed, Risk/Reward, or Custom target behavior and can save multiple fixed take profits.
- Dialog save handlers call the typed shared DB helpers passed from the account flow.

## Work Guidance

- Keep validation messages local and plain.
- Do not add edit/detail behavior here; this folder is for creation flows.

## Verification

- Run `npm run check` after dialog changes.
- Run `npm run dev` for modal layout changes.

## Child DOX Index

No child DOX files.
