# Components DOX

## Purpose

Owns reusable renderer components that are not specific to one module.

## Ownership

- `ModalShell.tsx`: shared single-panel modal shell for reusable popup layout.
- `layout/`: reusable shell layout components and their bundled assets.

## Local Contracts

- Components here must be reusable across modules or part of the shared shell.
- Single-panel popups should use `ModalShell` before adding module-local modal chrome.
- `ModalShell` supports optional full-width header content under the title/actions row.
- Popup windows stay below the app topbar; modal cards own their shell, and `.modal-body` is the scroll area.
- Module-specific components belong inside `src/modules/<module>/`.
- Use lucide-react for icons.
- Shell components receive data through props; they must not query the database directly.

## Work Guidance

- Keep component props typed and small.
- Do not import module data APIs from reusable components.
- Keep accessibility labels on icon-only buttons.

## Verification

- Run `npm run check` after component changes.

## Child DOX Index

- `layout/AGENTS.md` - reusable shell layout components.
