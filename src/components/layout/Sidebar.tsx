import { RefreshCw, Wallet } from "lucide-react";
import { useState } from "react";
import type { AppModule } from "../../app/types";
import { runAppUpdate, type AppUpdateState } from "../../shared/appUpdater";
import type { TradingAccount } from "../../shared/db/database";

type SidebarProps = {
  accounts: TradingAccount[];
  activeModuleId: string;
  isCollapsed: boolean;
  modules: AppModule[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onToggleCollapsed: () => void;
};

const appDisplayName =
  import.meta.env.VITE_APP_DISPLAY_NAME ?? "Trading Journal";
const appBadgeLabel = import.meta.env.VITE_APP_BADGE_LABEL ?? "Desktop";
const appBrandMark = import.meta.env.VITE_APP_BRAND_MARK ?? "T";

export function Sidebar({
  accounts,
  activeModuleId,
  isCollapsed,
  modules,
  selectedAccountId,
  onSelectAccount,
  onSelectModule,
  onToggleCollapsed,
}: SidebarProps) {
  const [updateState, setUpdateState] = useState<AppUpdateState>({
    isBusy: false,
    message: "",
    tone: "idle",
  });
  const mainGroups = [
    modules.filter((module) => module.id === "dashboard"),
    modules.filter(
      (module) => module.id === "trades" || module.id === "recaps",
    ),
    modules.filter((module) => module.id === "account"),
  ].filter((group) => group.length > 0);
  const bottomModules = modules.filter((module) => module.id === "settings");
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );

  async function handleUpdateClick() {
    if (updateState.isBusy) return;
    await runAppUpdate(setUpdateState);
  }

  function renderNavItem(module: AppModule) {
    const isActive = module.id === activeModuleId;
    const Icon = module.Icon;

    return (
      <button
        aria-current={isActive ? "page" : undefined}
        className={isActive ? "nav-item active" : "nav-item"}
        key={module.id}
        onClick={() => onSelectModule(module.id)}
        title={module.label}
        type="button"
      >
        <Icon aria-hidden="true" size={16} />
        <span>{module.label}</span>
      </button>
    );
  }

  return (
    <aside
      className={isCollapsed ? "sidebar collapsed" : "sidebar"}
      aria-label="Main navigation"
    >
      <div className="brand">
        <button
          aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          aria-pressed={isCollapsed}
          className="brand-mark"
          onClick={onToggleCollapsed}
          title={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          type="button"
        >
          {appBrandMark}
        </button>
        <div className="brand-copy">
          <strong>{appDisplayName}</strong>
          <span>{appBadgeLabel}</span>
        </div>
      </div>

      <label
        className="account-context-picker"
        title={selectedAccount?.name ?? "No account"}
      >
        <Wallet size={16} aria-hidden="true" />
        <span className="sr-only">Selected account</span>
        <select
          value={selectedAccountId ?? ""}
          onChange={(event) => onSelectAccount(event.target.value)}
          disabled={accounts.length === 0}
        >
          {accounts.length === 0 ? (
            <option value="">No account</option>
          ) : (
            accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))
          )}
        </select>
      </label>

      <nav className="nav-list nav-list-main" aria-label="Modules">
        {mainGroups.map((group) => (
          <div
            className="nav-section"
            key={group.map((module) => module.id).join("-")}
          >
            {group.map(renderNavItem)}
          </div>
        ))}
      </nav>

      <nav className="nav-list nav-list-bottom" aria-label="Settings">
        {bottomModules.map(renderNavItem)}
        <button
          className="nav-item sidebar-update-button"
          disabled={updateState.isBusy}
          onClick={handleUpdateClick}
          title={updateState.message || "Check for app updates"}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={updateState.isBusy ? "spin-icon" : undefined}
            size={16}
          />
          <span>{updateState.isBusy ? "Updating..." : "Update"}</span>
        </button>
        {updateState.message ? (
          <p className={`sidebar-update-status ${updateState.tone}`}>
            {updateState.message}
          </p>
        ) : null}
      </nav>
    </aside>
  );
}
