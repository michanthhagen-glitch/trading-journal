# Modules DOX

## Purpose

Owns all sidebar modules. Each module owns its own main content surface and local UI.

## Ownership

- `dashboard/`: performance summary and activity view.
- `account/`: accounts, strategies, and risk management setup.
- `trades/`: trade list, trade detail, lifecycle actions, pre-trade UI.
- `journal/`: daily, weekly, monthly recap views.
- `settings/`: preferences and data-management area.

## Local Contracts

- Each module exports one module component for `src/app/moduleRegistry.tsx`.
- Module-local components stay inside that module.
- Shared data access goes through `src/shared/db`.
- Do not add extra shell chrome inside modules unless the module truly needs it.

## Work Guidance

- Keep main views compact and summary-first.
- Put deeper detail behind row open, modal, drawer, side panel, or details view.
- Use local helper functions before creating shared abstractions.

## Verification

- Run `npm run check` after module changes.
- Run `npm run dev` for visual workflow changes.

## Child DOX Index

- `dashboard/AGENTS.md` - Dashboard module.
- `account/AGENTS.md` - Account, strategy, and risk management setup.
- `trades/AGENTS.md` - Trades module and trade lifecycle UI.
- `journal/AGENTS.md` - Journal recap module.
- `settings/AGENTS.md` - Settings module.
