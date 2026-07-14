import { useMemo, useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import {
  Topbar,
  type TopbarNotification,
  type TopbarSearchItem,
} from "../components/layout/Topbar";
import type {
  RiskManagementPlan,
  Strategy,
  Trade,
  TradingAccount,
} from "../shared/db/database";
import type { AppPreferences } from "../shared/appPreferences";
import type { TradingPlanSidebarInfo } from "../shared/tradingPlan";
import type { AppModule } from "./types";

type AppShellProps = {
  accounts: TradingAccount[];
  activeModule: AppModule;
  appPreferences: AppPreferences;
  modules: AppModule[];
  riskPlans: RiskManagementPlan[];
  selectedAccount: TradingAccount | null;
  selectedAccountId: string | null;
  selectedAccountTrades: Trade[];
  strategies: Strategy[];
  tradingPlanInfo: TradingPlanSidebarInfo;
  onAccountsChanged: () => void | Promise<void>;
  onAppPreferencesChanged: (
    preferences: AppPreferences,
  ) => void | Promise<void>;
  onSelectAccount: (accountId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onTradesChanged: () => void | Promise<void>;
};

export function AppShell({
  accounts,
  activeModule,
  appPreferences,
  modules,
  riskPlans,
  selectedAccount,
  selectedAccountId,
  selectedAccountTrades,
  strategies,
  tradingPlanInfo,
  onAccountsChanged,
  onAppPreferencesChanged,
  onSelectAccount,
  onSelectModule,
  onTradesChanged,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const ActiveModule = activeModule.Component;

  function openAccountSetup(
    kind: "accounts" | "strategies" | "risk",
    id: string,
  ) {
    onSelectModule("account");
    window.setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("trading-journal:open-account-setup", {
            detail: { kind, id },
          }),
        ),
      0,
    );
  }

  function openTrade(tradeId: string) {
    onSelectModule("trades");
    window.setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("trading-journal:open-trade", {
            detail: { tradeId },
          }),
        ),
      0,
    );
  }

  const searchItems = useMemo<TopbarSearchItem[]>(() => {
    const items: TopbarSearchItem[] = [];
    for (const account of accounts) {
      items.push({
        id: `account-${account.id}`,
        label: account.name,
        description: `${account.accountType} account`,
        keywords: `${account.currency} account`,
        onSelect: () => {
          onSelectAccount(account.id);
          openAccountSetup("accounts", account.id);
        },
      });
    }
    for (const strategy of strategies) {
      items.push({
        id: `strategy-${strategy.id}`,
        label: strategy.name,
        description: "Strategy",
        keywords: `${strategy.strategy} ${strategy.entryRules} ${strategy.slTpRules}`,
        onSelect: () => openAccountSetup("strategies", strategy.id),
      });
    }
    for (const plan of riskPlans) {
      items.push({
        id: `risk-${plan.id}`,
        label: plan.name,
        description: "Risk management plan",
        keywords: `${plan.riskPerTradeMinPercent ?? ""} ${plan.riskPerTradeMaxPercent ?? ""}`,
        onSelect: () => openAccountSetup("risk", plan.id),
      });
    }
    for (const trade of selectedAccountTrades) {
      items.push({
        id: `trade-${trade.id}`,
        label: `${trade.pair} · ${trade.date}`,
        description: `${trade.direction} trade · ${trade.status}`,
        keywords: `${trade.preTrade.strategy} ${trade.exit.result} ${trade.pnl ?? ""}`,
        onSelect: () => openTrade(trade.id),
      });
    }
    return items;
  }, [accounts, onSelectAccount, riskPlans, selectedAccountTrades, strategies]);

  const notifications = useMemo<TopbarNotification[]>(() => {
    const notices: TopbarNotification[] = [];
    const missingRecaps = selectedAccountTrades.filter(
      (trade) => trade.status === "closed" && !trade.hasRecap,
    ).length;
    const openTrades = selectedAccountTrades.filter(
      (trade) => trade.status === "open",
    ).length;
    if (missingRecaps > 0) {
      notices.push({
        id: "missing-recaps",
        title: `${missingRecaps} trade recap${missingRecaps === 1 ? "" : "s"} missing`,
        detail: "Open Trades to finish the review.",
        tone: "warning",
        onSelect: () => onSelectModule("trades"),
      });
    }
    if (openTrades > 0) {
      notices.push({
        id: "open-trades",
        title: `${openTrades} open trade${openTrades === 1 ? "" : "s"}`,
        detail: "Exit details are still waiting.",
        tone: "info",
        onSelect: () => onSelectModule("trades"),
      });
    }
    const selectedPlan = selectedAccount?.riskPlanId
      ? riskPlans.find((plan) => plan.id === selectedAccount.riskPlanId)
      : null;
    const requiredRiskValues = selectedPlan
      ? [
          selectedPlan.riskPerTradeMinPercent,
          selectedPlan.riskPerTradeMaxPercent,
          selectedPlan.riskPerDayMinPercent,
          selectedPlan.riskPerDayMidPercent,
          selectedPlan.riskPerDayMaxPercent,
          selectedPlan.riskPerWeekMinPercent,
          selectedPlan.riskPerWeekMaxPercent,
          selectedPlan.maxTradesPerDay,
          selectedPlan.maxLosingTradesPerDay,
          selectedPlan.maxLosingDaysInRow,
          selectedPlan.dailyGoalMinPercent,
          selectedPlan.dailyGoalMaxPercent,
          selectedPlan.weeklyGoalMinPercent,
          selectedPlan.weeklyGoalMidPercent,
          selectedPlan.weeklyGoalMaxPercent,
        ]
      : [];
    if (
      selectedAccount?.accountType === "live" &&
      (!selectedPlan ||
        requiredRiskValues.some((value) => value == null || value <= 0))
    ) {
      notices.push({
        id: "risk-plan",
        title: "Risk plan needs attention",
        detail: "Complete every risk limit before trading live.",
        tone: "warning",
        onSelect: () => onSelectModule("account"),
      });
    }
    return notices;
  }, [onSelectModule, riskPlans, selectedAccount, selectedAccountTrades]);

  return (
    <div
      className={
        isSidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"
      }
    >
      <Sidebar
        accounts={accounts}
        activeModuleId={activeModule.id}
        isCollapsed={isSidebarCollapsed}
        modules={modules}
        selectedAccountId={selectedAccountId}
        tradingPlanInfo={tradingPlanInfo}
        onSelectAccount={onSelectAccount}
        onSelectModule={onSelectModule}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div className="app-main">
        <Topbar
          activeModule={activeModule}
          searchItems={searchItems}
          notifications={notifications}
        />

        <main
          className={
            activeModule.id === "dashboard"
              ? "app-content app-content-dashboard"
              : "app-content"
          }
          aria-label={`${activeModule.label} module`}
        >
          <ActiveModule
            appPreferences={appPreferences}
            selectedAccount={selectedAccount}
            selectedAccountId={selectedAccountId}
            onAccountsChanged={onAccountsChanged}
            onAppPreferencesChanged={onAppPreferencesChanged}
            onTradesChanged={onTradesChanged}
          />
        </main>
      </div>
    </div>
  );
}
