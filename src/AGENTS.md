# Renderer DOX

## Purpose

Owns the React renderer: app shell, modules, reusable UI, shared helpers, and global styles.

## Ownership

- `main.tsx`: React root.
- `styles.css`: single global stylesheet and design tokens.
- `app/`: fixed shell and module registry.
- `components/`: reusable UI components.
- `modules/`: sidebar modules.
- `shared/`: cross-module helpers and data access.
- `vite-env.d.ts`: Vite typing support.

## Local Contracts

- Keep app content non-scrollable at the shell level; scrolling belongs inside module content.
- Keep CSS variables in `:root`; avoid ad-hoc colors.
- Keep dark theme only until a real theme system exists.
- Do not import Tauri SQL or filesystem plugins directly from modules; use `src/shared/db`.
- Use shared `list-table` CSS classes for compact framed lists before adding module-specific table copies.

## Work Guidance

- Use plain React and TypeScript. No Tailwind, CSS modules, or styled-components unless the project deliberately changes style system.
- Keep module-specific UI inside its module.
- Put only reusable UI in `src/components`.
- Keep tabs calm and stable: switching tabs changes content only.
- Shared modals open below the top bar instead of vertically centering around their content height.

## Verification

- Run `npm run check` for renderer changes.
- Run `npm run dev` for visual or interaction changes.

## Child DOX Index

- `app/AGENTS.md` - fixed app shell, sidebar/topbar wiring, module registry.
- `components/AGENTS.md` - reusable renderer components.
- `modules/AGENTS.md` - app modules and module-local UI.
- `shared/AGENTS.md` - shared helpers and data access.
