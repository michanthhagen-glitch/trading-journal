# Renderer DOX

## Purpose

Owns the React renderer: app shell, workspace modules, reusable UI, shared helpers, and global styles.

## Ownership

- `main.tsx`: React root.
- `styles.css`: single global stylesheet and design tokens.
- `app/`: fixed shell and workspace registry.
- `components/`: reusable UI components.
- `modules/`: sidebar workspaces.
- `shared/`: cross-module helpers and data access.
- `vite-env.d.ts`: Vite typing support.

## Local Contracts

- Keep workspace layout non-scrollable at the shell level; scrolling belongs inside module content.
- Keep CSS variables in `:root`; avoid ad-hoc colors.
- Keep dark theme only until a real theme system exists.
- Do not import Tauri SQL or filesystem plugins directly from modules; use `src/shared/db`.

## Work Guidance

- Use plain React and TypeScript. No Tailwind, CSS modules, or styled-components unless the project deliberately changes style system.
- Keep module-specific UI inside its module.
- Put only reusable UI in `src/components`.
- Keep tabs calm and stable: switching tabs changes content only.

## Verification

- Run `npm run check` for renderer changes.
- Run `npm run dev` for visual or interaction changes.

## Child DOX Index

- `app/AGENTS.md` - fixed app shell, sidebar/topbar wiring, workspace registry.
- `components/AGENTS.md` - reusable renderer components.
- `modules/AGENTS.md` - workspace modules and module-local UI.
- `shared/AGENTS.md` - shared helpers and data access.
