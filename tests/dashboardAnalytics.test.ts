import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../src/shared/appPreferences";
import type { Trade } from "../src/shared/db/database";
import { buildDashboardViewModel } from "../src/modules/dashboard/dashboardAnalytics";

function closedTrade(): Trade {
  return {
    id: "trade-1",
    accountId: "account-1",
    date: "2026-07-21",
    pair: "EURUSD",
    direction: "long",
    status: "closed",
    preTrade: {
      strategy: "Core strategy",
      keyLevel: "Daily support",
      entryCondition: "Rejection",
      riskPercent: 1,
      riskAmount: 10,
      bias: "Bullish",
      notes: "",
      feeling: 5,
    },
    entry: {
      time: "09:00",
      price: 1.1,
      lotSize: 1,
      stopLoss: 1.098,
      takeProfit: 1.102,
      takeProfits: [1.102],
      notes: "",
      confidence: 5,
    },
    exit: {
      price: 1.102,
      result: "win",
      note: "",
      feeling: 5,
      time: "10:00",
      exitCondition: "Target reached",
    },
    pnl: 100,
    backtestSessionId: null,
    backtestTestedAt: null,
    backtestTargets: [],
    hasRecap: false,
    recap: null,
    screenshots: [],
  };
}

describe("dashboard analytics", () => {
  it("builds total, month, and week summaries from one source", () => {
    const dashboard = buildDashboardViewModel({
      accountStart: 1_000,
      appPreferences: DEFAULT_APP_PREFERENCES,
      commissionPerLot: 5,
      now: new Date(2026, 6, 22),
      trades: [closedTrade()],
    });

    expect(dashboard.total).toMatchObject({
      balance: 1_095,
      closed: 1,
      commission: 5,
      netPnl: 95,
      wins: 1,
    });
    expect(dashboard.month.netPnl).toBe(95);
    expect(dashboard.week.netPnl).toBe(95);
    expect(dashboard.totalRankings.winningTrades[0]?.value).toBe(95);
  });

  it("keeps empty dashboards anchored to the account balance", () => {
    const dashboard = buildDashboardViewModel({
      accountStart: 2_500,
      appPreferences: DEFAULT_APP_PREFERENCES,
      commissionPerLot: 0,
      now: new Date(2026, 6, 22),
      trades: [],
    });

    expect(dashboard.total.balance).toBe(2_500);
    expect(dashboard.total.closed).toBe(0);
    expect(dashboard.totalDaily.length).toBeGreaterThan(0);
  });
});
