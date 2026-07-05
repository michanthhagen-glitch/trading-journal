# Layout Components DOX

## Purpose

Owns reusable shell layout components.

## Ownership

- `Sidebar.tsx`: sidebar navigation and active module state display.
- `Topbar.tsx`: active module title, account picker, search, and alert actions.

## Local Contracts

- Layout components receive data through props; they must not query the database.
- Navigation order comes from `src/app/moduleRegistry.tsx`.
- Topbar account selection must stay controlled by shell state.
- Use lucide-react icons for shell actions.

## Work Guidance

- Keep layout components small and prop-driven.
- Do not add module business logic here.

## Verification

- Run `npm run check` after layout changes.

## Child DOX Index

No child DOX files.
