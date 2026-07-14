/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BADGE_LABEL?: string;
  readonly VITE_APP_DISPLAY_NAME?: string;
  readonly VITE_TRADING_JOURNAL_DB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
