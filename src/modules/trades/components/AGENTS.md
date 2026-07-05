# Trade Components DOX

## Purpose

Owns module-local trade UI components used by `TradesModule.tsx`.

## Ownership

- `PreTradeCard.tsx`: saved pre-trade summary and screenshot gallery.
- `PreTradeForm.tsx`: pre-trade editor and screenshot draft handling.
- `ScreenshotTools.tsx`: screenshot import buttons, draft gallery, saved gallery, and screenshot preview modal.

## Local Contracts

- Components here are trade-module only unless another module truly needs them.
- Screenshot file, clipboard, and capture behavior goes through `src/shared/db/storage.ts`.
- Popups use the shared `ModalShell`.
- Screenshot stages stay aligned with trade workflow stages.

## Work Guidance

- Keep draft screenshot behavior separate from saved screenshot behavior.
- Keep physical file deletion deliberate and explicit.

## Verification

- Run `npm run check` after trade component changes.
- Use `npm run desktop:dev` for clipboard, dialog, filesystem, or window capture behavior.

## Child DOX Index

No child DOX files.
