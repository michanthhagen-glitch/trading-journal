# Account Features DOX

## Purpose

Owns account-module feature subfolders that are larger than the main tab view.

## Ownership

- `createAccountSetup/`: account, strategy, educator, and risk plan creation dialogs.

## Local Contracts

- Feature folders stay owned by the Account module.
- Shared persistence still goes through `src/shared/db/database.ts`.
- Reusable popup chrome comes from `src/components/ModalShell.tsx`.

## Work Guidance

- Keep feature folders focused on one workflow.
- Move code up to `src/components` only when another module actually uses it.

## Verification

- Run `npm run check` after account feature changes.

## Child DOX Index

- `createAccountSetup/AGENTS.md` - account setup creation dialogs.
