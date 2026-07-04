import { useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import type { TradingAccount } from "../shared/db/database";
import type { AppModule } from "./types";

type AppShellProps = {
  accounts: TradingAccount[];
  activeModule: AppModule;
  modules: AppModule[];
  selectedAccount: TradingAccount | null;
  selectedAccountId: string | null;
  onAccountsChanged: () => void | Promise<void>;
  onSelectAccount: (accountId: string) => void;
  onSelectModule: (moduleId: string) => void;
};

export function AppShell({
  accounts,
  activeModule,
  modules,
  selectedAccount,
  selectedAccountId,
  onAccountsChanged,
  onSelectAccount,
  onSelectModule,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const ActiveModule = activeModule.Component;

  return (
    <div
      className={
        isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"
      }
    >
      <Sidebar
        activeModuleId={activeModule.id}
        isCollapsed={isSidebarCollapsed}
        modules={modules}
        onSelectModule={onSelectModule}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div className="app-main">
        <Topbar
          accounts={accounts}
          activeModule={activeModule}
          selectedAccountId={selectedAccountId}
          onSelectAccount={onSelectAccount}
        />

        <main
          className="app-content"
          aria-label={`${activeModule.label} module`}
        >
          <ActiveModule
            selectedAccount={selectedAccount}
            selectedAccountId={selectedAccountId}
            onAccountsChanged={onAccountsChanged}
          />
        </main>
      </div>
    </div>
  );
}
