import { useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import type { TradingAccount } from "../shared/db/database";
import type { AppPreferences } from "../shared/appPreferences";
import type { AppModule } from "./types";

type AppShellProps = {
  accounts: TradingAccount[];
  activeModule: AppModule;
  appPreferences: AppPreferences;
  modules: AppModule[];
  selectedAccount: TradingAccount | null;
  selectedAccountId: string | null;
  onAccountsChanged: () => void | Promise<void>;
  onAppPreferencesChanged: (
    preferences: AppPreferences,
  ) => void | Promise<void>;
  onSelectAccount: (accountId: string) => void;
  onSelectModule: (moduleId: string) => void;
};

export function AppShell({
  accounts,
  activeModule,
  appPreferences,
  modules,
  selectedAccount,
  selectedAccountId,
  onAccountsChanged,
  onAppPreferencesChanged,
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
            appPreferences={appPreferences}
            selectedAccount={selectedAccount}
            selectedAccountId={selectedAccountId}
            onAccountsChanged={onAccountsChanged}
            onAppPreferencesChanged={onAppPreferencesChanged}
          />
        </main>
      </div>
    </div>
  );
}
