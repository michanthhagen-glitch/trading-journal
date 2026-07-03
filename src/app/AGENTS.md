# App Shell DOX

## Purpose

Owns the fixed app shell and maps sidebar items to workspace components.

## Ownership

- `App.tsx`: active workspace state.
- `AppShell.tsx`: sidebar, topbar, and workspace slot.
- `moduleRegistry.tsx`: Dashboard, Trades, Journal, Settings registration.
- `types.ts`: workspace module and section types.

## Local Contracts

- `src/app` stays shell-only. Do not put workspace business logic here.
- `moduleRegistry.tsx` is the single source for sidebar workspace order and icons.
- `AppShell` renders exactly one active workspace inside `<main className="workspace">`.
- The selected top-bar account is shell state and is passed to workspaces as context.

## Work Guidance

- Add new workspaces by creating `src/modules/<workspace>/`, then registering them in `moduleRegistry.tsx`.
- Keep shell state minimal and stable.
- Reusable layout pieces stay in `src/components/layout`.

## Verification

- Run `npm run check` after registry or shell changes.

## Child DOX Index

No child DOX files.
