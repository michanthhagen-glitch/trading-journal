import { useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import type { TradingAccount } from "../shared/db/database";
import type { WorkspaceModule, WorkspaceSection } from "./types";

type AppShellProps = {
  accounts: TradingAccount[];
  activeModule: WorkspaceModule;
  selectedAccount: TradingAccount | null;
  selectedAccountId: string | null;
  onAccountsChanged: () => void | Promise<void>;
  onSelectAccount: (accountId: string) => void;
  onSelectModule: (moduleId: string) => void;
  sections: WorkspaceSection[];
};

export function AppShell({
  accounts,
  activeModule,
  selectedAccount,
  selectedAccountId,
  onAccountsChanged,
  onSelectAccount,
  onSelectModule,
  sections,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const ActiveWorkspace = activeModule.Workspace;

  return (
    <div
      className={
        isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"
      }
    >
      <Sidebar
        activeModuleId={activeModule.id}
        isCollapsed={isSidebarCollapsed}
        onSelectModule={onSelectModule}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
        sections={sections}
      />

      <div className="app-main">
        <Topbar
          accounts={accounts}
          activeModule={activeModule}
          selectedAccountId={selectedAccountId}
          onSelectAccount={onSelectAccount}
        />

        <main
          className="workspace"
          aria-label={`${activeModule.label} workspace`}
        >
          <ActiveWorkspace
            selectedAccount={selectedAccount}
            selectedAccountId={selectedAccountId}
            onAccountsChanged={onAccountsChanged}
          />
        </main>
      </div>
    </div>
  );
}
