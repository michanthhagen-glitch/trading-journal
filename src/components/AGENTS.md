# Components DOX

## Purpose

Owns reusable renderer components that are not specific to one workspace.

## Ownership

- `layout/Sidebar.tsx`: collapsible navigation and workspace selection.
- `layout/Topbar.tsx`: active workspace title, account picker, and top actions.

## Local Contracts

- Components here must be reusable across modules or part of the shared shell.
- Module-specific components belong inside `src/modules/<module>/`.
- Use lucide-react for icons.
- `Topbar` receives account data through props; it must not query the database directly.

## Work Guidance

- Keep component props typed and small.
- Do not import workspace data APIs from reusable components.
- Keep accessibility labels on icon-only buttons.

## Verification

- Run `npm run check` after component changes.

## Child DOX Index

No child DOX files.
