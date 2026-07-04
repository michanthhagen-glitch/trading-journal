# Settings DOX

## Purpose

Owns preferences and data-management UI.

## Ownership

- `SettingsModule.tsx`: current placeholder for account, broker connections, backup, and theme.

## Local Contracts

- Settings is placeholder-only right now.
- Any real setting must have a storage plan before adding UI controls.
- Data import/export belongs here unless a more specific module owns the workflow.

## Work Guidance

- Keep settings grouped by task, not by implementation detail.
- Do not add a theme toggle until the CSS variables and persistence are ready.
- Prefer clear destructive-action safeguards for backup, restore, or delete flows.

## Verification

- Run `npm run check` after settings changes.
- Run `npm run dev` for layout changes.

## Child DOX Index

No child DOX files.
