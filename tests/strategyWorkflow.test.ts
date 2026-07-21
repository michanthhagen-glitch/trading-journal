import { describe, expect, it } from "vitest";
import type { Strategy } from "../src/shared/db/database";
import {
  mergeLinkedStrategies,
  resolveTargetPlan,
  strategyTargetInputs,
} from "../src/modules/trades/strategyWorkflow";

function strategy(overrides: Partial<Strategy> = {}): Strategy {
  return {
    id: "strategy-1",
    name: "Core strategy",
    strategy: "",
    entryRules: "",
    slTpRules: "",
    invalidationRules: "",
    currencyPairs: ["EURUSD"],
    keyLevels: ["Daily support"],
    entryConditions: ["Rejection"],
    exitConditions: ["Target reached"],
    targetMode: "custom",
    targetUnit: "pips",
    fixedStopLoss: null,
    fixedTakeProfits: [],
    riskRewardGoal: null,
    notes: "",
    created_at: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("strategy trade workflow", () => {
  it("combines all educator strategy choices", () => {
    const combined = mergeLinkedStrategies(
      ["strategy-1", "strategy-2"],
      [
        strategy({ targetMode: "risk-reward", riskRewardGoal: 3 }),
        strategy({
          id: "strategy-2",
          name: "Second strategy",
          currencyPairs: ["GBPUSD"],
          keyLevels: ["Weekly resistance"],
          entryConditions: ["Break and retest"],
          exitConditions: ["Structure break"],
          targetMode: "risk-reward",
          riskRewardGoal: 3,
        }),
      ],
    );

    expect(combined).toMatchObject({
      id: "strategy-1+strategy-2",
      name: "Core strategy, Second strategy",
      currencyPairs: ["EURUSD", "GBPUSD"],
      keyLevels: ["Daily support", "Weekly resistance"],
      targetMode: "risk-reward",
      riskRewardGoal: 3,
    });
  });

  it("uses custom targets when educator strategies have different plans", () => {
    const combined = mergeLinkedStrategies(
      ["strategy-1", "strategy-2"],
      [
        strategy({
          targetMode: "fixed",
          fixedStopLoss: 20,
          fixedTakeProfits: [30],
        }),
        strategy({
          id: "strategy-2",
          targetMode: "risk-reward",
          riskRewardGoal: 3,
        }),
      ],
    );

    expect(combined).toMatchObject({
      targetMode: "custom",
      fixedStopLoss: null,
      fixedTakeProfits: [],
      riskRewardGoal: null,
    });
  });

  it("creates the right starting fields for every plan type", () => {
    expect(
      strategyTargetInputs(
        strategy({
          targetMode: "fixed",
          fixedStopLoss: 20,
          fixedTakeProfits: [10, 20, 30],
        }),
      ),
    ).toEqual({ stopLoss: "20", takeProfits: ["10", "20", "30"] });
    expect(
      strategyTargetInputs(
        strategy({ targetMode: "risk-reward", riskRewardGoal: 3 }),
      ),
    ).toEqual({ stopLoss: "", takeProfits: ["", "", ""] });
    expect(strategyTargetInputs(strategy())).toEqual({
      stopLoss: "",
      takeProfits: [""],
    });
  });

  it("calculates every RR target from the stop loss", () => {
    const plan = resolveTargetPlan({
      strategy: strategy({
        targetMode: "risk-reward",
        riskRewardGoal: 3,
      }),
      preferredUnit: "pips",
      instrument: "EURUSD",
      entryPrice: "1.10000",
      direction: "long",
      stopLossInput: "20",
      takeProfitInputs: ["", "", ""],
    });

    expect(plan.stopLoss?.price).toBe(1.098);
    expect(plan.takeProfits).toEqual([
      { input: "20", price: 1.102, riskRewardRatio: 1 },
      { input: "40", price: 1.104, riskRewardRatio: 2 },
      { input: "60", price: 1.106, riskRewardRatio: 3 },
    ]);
  });

  it("calculates custom target prices and RR once for both workflows", () => {
    const plan = resolveTargetPlan({
      strategy: strategy(),
      preferredUnit: "price",
      instrument: "EURUSD",
      entryPrice: "1.10000",
      direction: "long",
      stopLossInput: "1.09800",
      takeProfitInputs: ["1.10200", "1.10600"],
    });

    expect(plan.takeProfits).toEqual([
      { input: "1.10200", price: 1.102, riskRewardRatio: 1 },
      { input: "1.10600", price: 1.106, riskRewardRatio: 3 },
    ]);
  });
});
