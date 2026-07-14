import { useEffect, useMemo, useState } from "react";
import {
  listAccountSetup,
  listTrades,
  type RiskManagementPlan,
  type Strategy,
  type Trade,
  type TradingAccount,
} from "../shared/db/database";
import {
  loadAppPreferences,
  saveAppPreferences,
  subscribeAppPreferences,
  type AppPreferences,
} from "../shared/appPreferences";
import { buildTradingPlanSidebarInfo } from "../shared/tradingPlan";
import { AppShell } from "./AppShell";
import { appModules } from "./moduleRegistry";

const SELECTED_ACCOUNT_STORAGE_KEY = "trading-journal:selected-account-id";

export function App() {
  const [activeModuleId, setActiveModuleId] = useState(appModules[0].id);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [riskPlans, setRiskPlans] = useState<RiskManagementPlan[]>([]);
  const [selectedAccountTrades, setSelectedAccountTrades] = useState<Trade[]>(
    [],
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY),
  );
  const [appPreferences, setAppPreferences] = useState(loadAppPreferences);
  const [tradeRefreshKey, setTradeRefreshKey] = useState(0);
  const [planNow, setPlanNow] = useState(() => new Date());

  const activeModule = useMemo(
    () =>
      appModules.find((module) => module.id === activeModuleId) ??
      appModules[0],
    [activeModuleId],
  );

  async function reloadAccounts() {
    const data = await listAccountSetup();
    setAccounts(data.accounts);
    setStrategies(data.strategies);
    setRiskPlans(data.riskPlans);
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

  useEffect(() => {
    let cancelled = false;

    async function reloadSelectedAccountTrades() {
      const rows = selectedAccountId ? await listTrades(selectedAccountId) : [];
      if (!cancelled) setSelectedAccountTrades(rows);
    }

    void reloadSelectedAccountTrades();

    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, tradeRefreshKey]);

  useEffect(() => {
    let midnightTimer: number | null = null;

    function refreshPlanClock() {
      setPlanNow(new Date());
      setTradeRefreshKey((current) => current + 1);
    }

    function scheduleMidnightRefresh() {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      midnightTimer = window.setTimeout(
        () => {
          refreshPlanClock();
          scheduleMidnightRefresh();
        },
        Math.max(nextMidnight.getTime() - current.getTime() + 1000, 1000),
      );
    }

    scheduleMidnightRefresh();
    window.addEventListener("focus", refreshPlanClock);
    document.addEventListener("visibilitychange", refreshPlanClock);

    return () => {
      if (midnightTimer) window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", refreshPlanClock);
      document.removeEventListener("visibilitychange", refreshPlanClock);
    };
  }, []);

  useEffect(() => subscribeAppPreferences(setAppPreferences), []);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );
  const selectedRiskPlan = useMemo(
    () =>
      selectedAccount?.riskPlanId
        ? (riskPlans.find((plan) => plan.id === selectedAccount.riskPlanId) ??
          null)
        : null,
    [riskPlans, selectedAccount],
  );
  const tradingPlanInfo = useMemo(
    () =>
      buildTradingPlanSidebarInfo({
        account: selectedAccount,
        appPreferences,
        now: planNow,
        riskPlan: selectedRiskPlan,
        trades: selectedAccountTrades,
      }),
    [
      appPreferences,
      planNow,
      selectedAccount,
      selectedAccountTrades,
      selectedRiskPlan,
    ],
  );

  function handleSelectAccount(accountId: string) {
    setSelectedAccountId(accountId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, accountId);
    }
  }

  function handleAppPreferencesChanged(preferences: AppPreferences) {
    setAppPreferences(saveAppPreferences(preferences));
  }

  function handleTradesChanged() {
    setTradeRefreshKey((current) => current + 1);
  }

  return (
    <AppShell
      accounts={accounts}
      activeModule={activeModule}
      appPreferences={appPreferences}
      modules={appModules}
      riskPlans={riskPlans}
      selectedAccountTrades={selectedAccountTrades}
      strategies={strategies}
      tradingPlanInfo={tradingPlanInfo}
      onSelectModule={setActiveModuleId}
      onSelectAccount={handleSelectAccount}
      selectedAccount={selectedAccount}
      selectedAccountId={selectedAccountId}
      onAccountsChanged={reloadAccounts}
      onAppPreferencesChanged={handleAppPreferencesChanged}
      onTradesChanged={handleTradesChanged}
    />
  );
}
