import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../src/shared/appPreferences";
import {
  buildTradingPlanSidebarInfo,
  type TradingPlanToken,
} from "../src/shared/tradingPlan";
import type {
  RiskManagementPlan,
  Trade,
  TradingAccount,
} from "../src/shared/db/database";

const account: TradingAccount = {
  id: "ACC-1",
  name: "Main",
  startingBalance: 300,
  commission: 0,
  currency: "USD",
  accountType: "demo",
  strategyIds: [],
  riskPlanId: "RISK-1",
  created_at: "2026-07-01",
};

const riskPlan: RiskManagementPlan = {
  id: "RISK-1",
  name: "Test plan",
  riskPercent: 1,
  maxDailyLossPercent: 6,
  riskPerTradeMinPercent: 0.5,
  riskPerTradeMaxPercent: 1,
  riskPerDayMinPercent: 4,
  riskPerDayMidPercent: 5,
  riskPerDayMaxPercent: 6,
  riskPerWeekMinPercent: 4,
  riskPerWeekMaxPercent: 8,
  maxTradesPerDay: 2,
  maxLosingTradesPerDay: 2,
  maxLosingDaysInRow: 2,
  dailyGoalMinPercent: 4,
  dailyGoalMaxPercent: 8,
  weeklyGoalMinPercent: 4,
  weeklyGoalMidPercent: 6,
  weeklyGoalMaxPercent: 8,
  notes: "",
  created_at: "2026-07-01",
};

function trade(input: {
  date?: string;
  id: string;
  pnl: number;
  result?: Trade["exit"]["result"];
  time?: string;
}): Trade {
  return {
    id: input.id,
    accountId: "ACC-1",
    date: input.date ?? "2026-07-08",
    pair: "EURUSD",
    direction: "long",
    status: "closed",
    preTrade: {
      strategy: "",
      riskPercent: null,
      riskAmount: null,
      bias: "",
      notes: "",
      feeling: null,
    },
    entry: {
      time: input.time ?? "10:00",
      price: null,
      lotSize: null,
      stopLoss: null,
      takeProfit: null,
      notes: "",
      confidence: null,
    },
    exit: {
      price: null,
      result: input.result ?? (input.pnl < 0 ? "loss" : "win"),
      note: "",
      feeling: null,
      time: input.time ?? "10:00",
    },
    pnl: input.pnl,
    hasRecap: false,
    recap: null,
    screenshots: [],
  };
}

function token(tokens: TradingPlanToken[], label: string) {
  return tokens.find((row) => row.label === label);
}

describe("trading plan sidebar info", () => {
  it("marks risk milestones and rule counts from today's trades", () => {
    const info = buildTradingPlanSidebarInfo({
      account,
      appPreferences: DEFAULT_APP_PREFERENCES,
      now: new Date(2026, 6, 8),
      riskPlan,
      trades: [trade({ id: "loss", pnl: -12 })],
    });

    expect(token(info.risk.day, "Min")?.targetLabel).toBe("$288");
    expect(token(info.risk.day, "Min")?.tone).toBe("danger");
    expect(token(info.goal.day, "Min")?.tone).toBe("neutral");
    expect(info.rules.map((rule) => [rule.value, rule.tone])).toEqual([
      ["1/2", "safe"],
      ["1/2", "safe"],
      ["1/2", "safe"],
    ]);
  });

  it("marks reached goals and resets loss streak after a win", () => {
    const info = buildTradingPlanSidebarInfo({
      account,
      appPreferences: DEFAULT_APP_PREFERENCES,
      now: new Date(2026, 6, 8),
      riskPlan,
      trades: [
        trade({ id: "loss", pnl: -12, time: "10:00" }),
        trade({ id: "win", pnl: 24, time: "11:00" }),
      ],
    });

    expect(token(info.goal.day, "Min")?.targetLabel).toBe("$312");
    expect(token(info.goal.day, "Min")?.tone).toBe("success");
    expect(info.rules.map((rule) => [rule.value, rule.tone])).toEqual([
      ["2/2", "warning"],
      ["0/2", "safe"],
      ["0/2", "safe"],
    ]);
  });

  it("flashes rule counters after going above the plan limit", () => {
    const oneLossLimit = {
      ...riskPlan,
      maxTradesPerDay: 1,
      maxLosingTradesPerDay: 1,
      maxLosingDaysInRow: 1,
    };
    const info = buildTradingPlanSidebarInfo({
      account,
      appPreferences: DEFAULT_APP_PREFERENCES,
      now: new Date(2026, 6, 8),
      riskPlan: oneLossLimit,
      trades: [
        trade({ id: "monday", date: "2026-07-07", pnl: -5 }),
        trade({ id: "loss-1", pnl: -12, time: "10:00" }),
        trade({ id: "loss-2", pnl: -10, time: "11:00" }),
      ],
    });

    expect(info.rules.map((rule) => [rule.value, rule.tone])).toEqual([
      ["2/1", "alarm"],
      ["2/1", "alarm"],
      ["2/1", "alarm"],
    ]);
  });
});
