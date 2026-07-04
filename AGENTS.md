# Trading Journal - DOX Root

## Purpose

Desktop trading journal for logging trades, pre-trade analysis, exits, screenshots, and daily/weekly/monthly recaps.

## DOX Core Contract

- AGENTS.md files are binding work contracts for their folder and children.
- Before editing, read this root file, identify the paths you will touch, then read every AGENTS.md on the route to those paths.
- If docs conflict, the closer AGENTS.md controls local details, but child docs cannot weaken this root contract.
- Do not rely on memory for the DOX chain. Re-read the applicable docs in the current session.
- After meaningful changes, update the closest owning AGENTS.md and any parent Child DOX Index that changed.
- Keep docs concise, current, and operational. Delete stale notes instead of explaining history.

## Project Stack

- Frontend: React 18 + TypeScript + Vite.
- Icons: lucide-react.
- Desktop shell: Tauri 2.
- Persistence: SQLite via `@tauri-apps/plugin-sql`, stored as `trading-journal.db` in app data.
- Backend: none. Renderer code talks to SQLite through the Tauri bridge.
- Styling: one global stylesheet, `src/styles.css`.

## Scripts

```text
npm run dev             # Vite dev server on 127.0.0.1:5173
npm run build           # tsc --noEmit && vite build
npm run desktop:dev     # Tauri dev window
npm run desktop:build   # Tauri production build
npm run test            # vitest run
npm run check           # format:check + build + test
npm run format          # prettier --write .
```

## Product Model

- Modules: Dashboard, Account, Trades, Journal, Settings.
- Trade workflow: pre-trade, entry, exit.
- Per-trade recaps stay on the trade.
- Recaps are a separate feature from the trade entry/exit workflow.
- Journal recaps are time-bounded: daily, weekly, monthly.

## Root Ownership

- `package.json`, `package-lock.json`: scripts and dependencies.
- `vite.config.ts`, `tsconfig.json`, `index.html`: frontend build setup.
- `.gitignore`, `.prettierignore`: repo-level ignore rules.
- `AGENTS.md`: root DOX contract and top-level index.

## Global Work Guidance

- Keep answers and docs short, simple, and practical.
- Keep the module-owned structure: shell in `src/app`, modules in `src/modules`, reusable UI in `src/components`, shared helpers in `src/shared`.
- Use lucide icons for UI icons.
- Do not add new top-level folders unless the boundary is durable.
- Keep root docs broad; put concrete local rules in child AGENTS.md files.

## Verification

- Run `npm run check` after meaningful code or docs structure changes.
- For UI behavior changes, also run the app with `npm run dev` when visual behavior matters.
- For Tauri/native changes, run the relevant desktop command when the change cannot be verified in browser mode.

## Child DOX Index

- `src/AGENTS.md` - React renderer, app shell, modules, shared frontend code, and global CSS.
- `src-tauri/AGENTS.md` - Tauri desktop shell, plugins, permissions, and SQLite migrations.
- `tests/AGENTS.md` - Vitest tests.
