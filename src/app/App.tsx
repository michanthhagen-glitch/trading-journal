import { useEffect, useMemo, useState } from "react";
import { listAccountSetup, type TradingAccount } from "../shared/db/database";
import { AppShell } from "./AppShell";
import { appModules } from "./moduleRegistry";

const SELECTED_ACCOUNT_STORAGE_KEY = "trading-journal:selected-account-id";

export function App() {
  const [activeModuleId, setActiveModuleId] = useState(appModules[0].id);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY),
  );

  const activeModule = useMemo(
    () =>
      appModules.find((module) => module.id === activeModuleId) ??
      appModules[0],
    [activeModuleId],
  );

  async function reloadAccounts() {
    const data = await listAccountSetup();
    setAccounts(data.accounts);
    setSelectedAccountId((current) => {
      const stored =
        current ??
        (typeof window === "undefined"
          ? null
          : window.localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY));
      const next =
        stored && data.accounts.some((account) => account.id === stored)
          ? stored
          : (data.accounts[0]?.id ?? null);

      if (typeof window !== "undefined") {
        if (next) {
          window.localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, next);
        } else {
          window.localStorage.removeItem(SELECTED_ACCOUNT_STORAGE_KEY);
        }
      }

      return next;
    });
  }

  useEffect(() => {
    reloadAccounts();
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  function handleSelectAccount(accountId: string) {
    setSelectedAccountId(accountId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, accountId);
    }
  }

  return (
    <AppShell
      accounts={accounts}
      activeModule={activeModule}
      modules={appModules}
      onSelectModule={setActiveModuleId}
      onSelectAccount={handleSelectAccount}
      selectedAccount={selectedAccount}
      selectedAccountId={selectedAccountId}
      onAccountsChanged={reloadAccounts}
    />
  );
}
