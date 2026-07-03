import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { TradingAccount } from "../shared/db/database";

export type WorkspaceContext = {
  selectedAccount: TradingAccount | null;
  selectedAccountId: string | null;
  onAccountsChanged: () => void | Promise<void>;
};

export type WorkspaceModule = {
  id: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  Workspace: ComponentType<WorkspaceContext>;
};

export type WorkspaceSection = {
  id: string;
  label: string;
  Icon: LucideIcon;
  modules: WorkspaceModule[];
};
