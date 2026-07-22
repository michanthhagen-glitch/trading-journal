import { describe, expect, it } from "vitest";
import type {
  RiskManagementPlan,
  TradingAccount,
} from "../src/shared/db/database";
import {
  buildNewTradeSubmission,
  type NewTradeFormState,
} from "../src/modules/trades/newTradeSubmission";
import { resolveTargetPlan } from "../src/modules/trades/strategyWorkflow";

function account(accountType: TradingAccount["accountType"] = "live") {
  return {
    id: "account-1",
    name: "Main account",
    startingBalance: 10_000,
    commission: 0,
    currency: "USD",
    accountType,
    strategyIds: ["strategy-1"],
    educatorIds: [],
    riskPlanId: null,
    created_at: "2026-07-22T00:00:00.000Z",
  } satisfies TradingAccount;
}

function form(overrides: Partial<NewTradeFormState> = {}): NewTradeFormState {
  return {
    date: "2026-07-22",
    pair: "eurusd",
    direction: "long",
    strategy: "Core strategy",
    keyLevel: "Daily support",
    entryCondition: "Rejection",
    exitCondition: "Target reached",
    riskPercent: "1",
    riskAmount: "100",
    bias: "Bullish",
    setupNotes: "Clean setup",
    feelingBefore: 5,
    entryTime: "09:15",
    entryPrice: "1.10000",
    lotSize: "1",
    stopLoss: "1.09800",
    takeProfits: ["1.10200"],
    entryNotes: "Entered on confirmation",
    confidence: 4,
    exitPrice: "",
    exitTime: "",
    result: "",
    pnl: "",
    exitNote: "",
    feelingAfter: 5,
    ...overrides,
  };
}

function targetPlan(state: NewTradeFormState) {
  return resolveTargetPlan({
    strategy: null,
    preferredUnit: "price",
    instrument: state.pair,
    entryPrice: state.entryPrice,
    direction: state.direction,
    stopLossInput: state.stopLoss,
    takeProfitInputs: state.takeProfits,
  });
}

function riskPlan(): RiskManagementPlan {
  return {
    id: "risk-1",
    name: "Standard risk",
    riskPercent: 1,
    maxDailyLossPercent: 3,
    riskPerTradeMinPercent: 0.5,
    riskPerTradeMaxPercent: 1,
    riskPerDayMinPercent: 0.5,
    riskPerDayMidPercent: 1,
    riskPerDayMaxPercent: 2,
    riskPerWeekMinPercent: 1,
    riskPerWeekMaxPercent: 5,
    maxTradesPerDay: 3,
    maxLosingTradesPerDay: 2,
    maxLosingDaysInRow: 2,
    dailyGoalMinPercent: 1,
    dailyGoalMaxPercent: 2,
    weeklyGoalMinPercent: 2,
    weeklyGoalMidPercent: 3,
    weeklyGoalMaxPercent: 5,
    notes: "",
    created_at: "2026-07-22T00:00:00.000Z",
  };
}

describe("new trade submission", () => {
  it("builds the persisted trade from validated form values", () => {
    const state = form();
    const result = buildNewTradeSubmission({
      account: account(),
      form: state,
      isSystemAccount: false,
      riskPlan: null,
      sourceLabel: "Strategy",
      targetPlan: targetPlan(state),
      tradeSourceCount: 1,
    });

    expect(result.error).toBeNull();
    expect(result.trade).toMatchObject({
      accountId: "account-1",
      pair: "EURUSD",
      preTrade: { strategy: "Core strategy", riskPercent: 1 },
      entry: {
        price: 1.1,
        stopLoss: 1.098,
        takeProfit: 1.102,
        takeProfits: [1.102],
      },
    });
  });

  it("keeps risk plan validation in one place", () => {
    const state = form({ riskPercent: "1.5" });
    const result = buildNewTradeSubmission({
      account: account(),
      form: state,
      isSystemAccount: false,
      riskPlan: riskPlan(),
      sourceLabel: "Strategy",
      targetPlan: targetPlan(state),
      tradeSourceCount: 1,
    });

    expect(result).toEqual({
      error: "Risk % must be 1% or lower.",
      trade: null,
    });
  });

  it("removes normal strategy planning fields for system accounts", () => {
    const state = form();
    const result = buildNewTradeSubmission({
      account: account("system"),
      form: state,
      isSystemAccount: true,
      riskPlan: null,
      sourceLabel: "Educator",
      targetPlan: targetPlan(state),
      tradeSourceCount: 1,
    });

    expect(result.trade?.preTrade).toMatchObject({
      riskPercent: null,
      riskAmount: null,
      bias: "",
      notes: "",
      feeling: null,
    });
  });
});
