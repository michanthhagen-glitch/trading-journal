import { Bell, Search, Wallet } from "lucide-react";
import type { AppModule } from "../../app/types";
import type { TradingAccount } from "../../shared/db/database";

type TopbarProps = {
  accounts: TradingAccount[];
  activeModule: AppModule;
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
};

export function Topbar({
  accounts,
  activeModule,
  selectedAccountId,
  onSelectAccount,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{activeModule.description}</p>
        <h1>{activeModule.label}</h1>
      </div>

      <div className="topbar-actions">
        <label className="account-context-picker">
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
        <button aria-label="Search" className="icon-button" type="button">
          <Search aria-hidden="true" size={18} />
        </button>
        <button
          aria-label="Notifications"
          className="icon-button"
          type="button"
        >
          <Bell aria-hidden="true" size={18} />
        </button>
      </div>
    </header>
  );
}
