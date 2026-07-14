# Layout Components DOX

## Purpose

Owns reusable shell layout components.

## Ownership

- `Sidebar.tsx`: sidebar navigation and active module state display.
- `Topbar.tsx`: active module title, keyboard-accessible global search, and notification panel.

## Local Contracts

- Layout components receive data through props; they must not query the database.
- Navigation order comes from `src/app/moduleRegistry.tsx`.
- Sidebar visually groups the account picker, Dashboard, Trades/Recaps, Account, and keeps Settings plus Update pinned at the bottom.
- Sidebar account selection must stay controlled by shell state.
- Sidebar trading plan display is prop-driven, shows milestone tones, and stays above the pinned Settings/Update controls.
- Sidebar trading plan header owns the hidden Brioche plan-check Easter egg and bundled song button.
- Sidebar trading plan section labels are visual labels, not document headings.
- Sidebar Update checks the Tauri updater only from the installed desktop app; browser preview should show a friendly desktop-only message.
- Topbar search supports Ctrl+K and receives prepared results through props; notifications receive prepared alerts through props.
- Use lucide-react icons for shell actions.

## Work Guidance

- Keep layout components small and prop-driven.
- Do not add module business logic here.

## Verification

- Run `npm run check` after layout changes.

## Child DOX Index

No child DOX files.
