# App Shell DOX

## Purpose

Owns the fixed app shell and maps sidebar items to module components.

## Ownership

- `App.tsx`: active module state.
- `AppShell.tsx`: sidebar, topbar, and module content slot.
- `moduleRegistry.tsx`: Dashboard, Trades, Recaps, Account, Settings registration.
- `types.ts`: app module and module context types.

## Local Contracts

- `src/app` stays shell-only. Do not put module business logic here.
- `moduleRegistry.tsx` is the single source for sidebar module order and icons.
- Sidebar order is Dashboard, Trades, Recaps, Account, then Settings.
- `AppShell` renders exactly one active module inside `<main className="app-content">`.
- The selected top-bar account is shell state and is passed to modules as context.
- App preferences are shell context so modules stay visually consistent.

## Work Guidance

- Add new modules by creating `src/modules/<module>/`, then registering them in `moduleRegistry.tsx`.
- Keep shell state minimal and stable.
- Reusable layout pieces stay in `src/components/layout`.

## Verification

- Run `npm run check` after registry or shell changes.

## Child DOX Index

No child DOX files.
