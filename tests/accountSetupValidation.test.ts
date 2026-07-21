import { describe, expect, it } from "vitest";
import {
  validateEducatorSetup,
  validateRiskPlanSetup,
  validateStrategySetup,
  validateTradingAccountSetup,
  type RiskPlanSetupInput,
} from "../src/shared/db/accountSetupValidation";

const validRiskPlan: RiskPlanSetupInput = {
  name: "1% plan",
  riskPerTradeMinPercent: 0.5,
  riskPerTradeMaxPercent: 1,
  riskPerDayMinPercent: 1,
  riskPerDayMidPercent: 2,
  riskPerDayMaxPercent: 3,
  riskPerWeekMinPercent: 2,
  riskPerWeekMaxPercent: 6,
  maxTradesPerDay: 3,
  maxLosingTradesPerDay: 2,
  maxLosingDaysInRow: 2,
  dailyGoalMinPercent: 1,
  dailyGoalMaxPercent: 2,
  weeklyGoalMinPercent: 3,
  weeklyGoalMidPercent: 5,
  weeklyGoalMaxPercent: 8,
  notes: "",
};

describe("account setup validation", () => {
  it("accepts Forex, index, metal, energy, crypto, and broker symbols", () => {
    expect(() =>
      validateStrategySetup({
        name: "Continuation",
        strategy: "",
        entryRules: "",
        slTpRules: "",
        invalidationRules: "",
        currencyPairs: [
          "EURUSD",
          "GBPJPY",
          "NAS100",
          "XAUUSD",
          "UKOIL",
          "BTCUSD",
          "NAS100.CASH",
        ],
        keyLevels: [],
        entryConditions: [],
        exitConditions: [],
        targetMode: "custom",
        targetUnit: "price",
        fixedStopLoss: null,
        fixedTakeProfits: [],
        riskRewardGoal: null,
      }),
    ).not.toThrow();
  });

  it("requires complete fixed strategy targets", () => {
    const fixedStrategy = {
      name: "Fixed targets",
      strategy: "",
      entryRules: "",
      slTpRules: "",
      invalidationRules: "",
      currencyPairs: ["EURUSD"],
      keyLevels: [],
      entryConditions: [],
      exitConditions: [],
      targetMode: "fixed" as const,
      targetUnit: "pips" as const,
      fixedStopLoss: 20,
      fixedTakeProfits: [10, 20, 30],
      riskRewardGoal: null,
    };

    expect(() => validateStrategySetup(fixedStrategy)).not.toThrow();
    expect(() =>
      validateStrategySetup({ ...fixedStrategy, fixedTakeProfits: [] }),
    ).toThrow("Add at least one fixed take profit");
  });

  it("requires a whole-number RR goal", () => {
    const rrStrategy = {
      name: "Three R",
      strategy: "",
      entryRules: "",
      slTpRules: "",
      invalidationRules: "",
      currencyPairs: ["EURUSD"],
      keyLevels: [],
      entryConditions: [],
      exitConditions: [],
      targetMode: "risk-reward" as const,
      targetUnit: "pips" as const,
      fixedStopLoss: null,
      fixedTakeProfits: [],
      riskRewardGoal: 3,
    };

    expect(() => validateStrategySetup(rrStrategy)).not.toThrow();
    expect(() =>
      validateStrategySetup({ ...rrStrategy, riskRewardGoal: 2.5 }),
    ).toThrow("whole number");
  });

  it("requires an educator name", () => {
    expect(() =>
      validateEducatorSetup({
        name: "",
        community: "Alpha",
        notes: "",
        strategyIds: [],
      }),
    ).toThrow("Educator name is required");
  });

  it("allows an explicit zero commission", () => {
    expect(() =>
      validateTradingAccountSetup({
        name: "Demo",
        startingBalance: 10000,
        commission: 0,
        currency: "USD",
        accountType: "demo",
        strategyIds: ["STR-1"],
        educatorIds: [],
        riskPlanId: null,
      }),
    ).not.toThrow();
  });

  it("rejects a blank commission represented by an invalid number", () => {
    expect(() =>
      validateTradingAccountSetup({
        name: "Demo",
        startingBalance: 10000,
        commission: Number.NaN,
        currency: "USD",
        accountType: "demo",
        strategyIds: ["STR-1"],
        educatorIds: [],
        riskPlanId: null,
      }),
    ).toThrow("Commission is required");
  });

  it("uses educators instead of strategies for system accounts", () => {
    expect(() =>
      validateTradingAccountSetup({
        name: "Community calls",
        startingBalance: 10000,
        commission: 0,
        currency: "USD",
        accountType: "system",
        strategyIds: [],
        educatorIds: ["EDU-1"],
        riskPlanId: null,
      }),
    ).not.toThrow();

    expect(() =>
      validateTradingAccountSetup({
        name: "Community calls",
        startingBalance: 10000,
        commission: 0,
        currency: "USD",
        accountType: "system",
        strategyIds: ["STR-1"],
        educatorIds: [],
        riskPlanId: null,
      }),
    ).toThrow("Select at least one educator");
  });

  it("requires every risk value and rejects zero", () => {
    expect(() =>
      validateRiskPlanSetup({
        ...validRiskPlan,
        riskPerTradeMinPercent: null,
      }),
    ).toThrow("Risk per trade min is required");
    expect(() =>
      validateRiskPlanSetup({ ...validRiskPlan, maxTradesPerDay: 0 }),
    ).toThrow("Max trades per day is required");
  });

  it("accepts a complete ordered risk plan", () => {
    expect(() => validateRiskPlanSetup(validRiskPlan)).not.toThrow();
  });

  it("rejects reversed risk ranges", () => {
    expect(() =>
      validateRiskPlanSetup({
        ...validRiskPlan,
        riskPerTradeMinPercent: 2,
        riskPerTradeMaxPercent: 1,
      }),
    ).toThrow("min cannot be higher than max");
  });
});
