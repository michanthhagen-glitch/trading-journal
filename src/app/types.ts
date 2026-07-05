import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { TradingAccount } from "../shared/db/database";
import type { AppPreferences } from "../shared/appPreferences";

export type ModuleContext = {
  appPreferences: AppPreferences;
  selectedAccount: TradingAccount | null;
  selectedAccountId: string | null;
  onAccountsChanged: () => void | Promise<void>;
  onAppPreferencesChanged: (
    preferences: AppPreferences,
  ) => void | Promise<void>;
};

export type AppModule = {
  id: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  Component: ComponentType<ModuleContext>;
};
