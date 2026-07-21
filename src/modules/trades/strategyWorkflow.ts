import type { Strategy } from "../../shared/db/database";
import {
  calculateRiskRewardRatio,
  calculateRiskRewardTargets,
  calculateTradeTarget,
  tradeTargetInputFromPrice,
  type TradeDirection,
  type TradeTargetCalculation,
  type TradeTargetUnit,
} from "../../shared/tradeInstruments";

export type ResolvedTarget = {
  input: string;
  price: number | null;
  riskRewardRatio: number | null;
};

export type ResolvedTargetPlan = {
  mode: Strategy["targetMode"];
  unit: TradeTargetUnit;
  stopLoss: TradeTargetCalculation | null;
  takeProfits: ResolvedTarget[];
};

function finiteNumber(value: string | number | null) {
  if (value === null || (typeof value === "string" && !value.trim())) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTradeNumber(value: string) {
  return finiteNumber(value);
}

export function mergeLinkedStrategies(
  strategyIds: string[],
  strategies: Strategy[],
): Strategy | null {
  const linkedIds = new Set(strategyIds);
  const linkedStrategies = strategies.filter((strategy) =>
    linkedIds.has(strategy.id),
  );
  const first = linkedStrategies[0];
  if (!first) return null;
  if (linkedStrategies.length === 1) return first;

  const uniqueValues = (pick: (strategy: Strategy) => string[]) =>
    Array.from(new Set(linkedStrategies.flatMap(pick)));
  const targetPlanKey = (strategy: Strategy) =>
    JSON.stringify({
      targetMode: strategy.targetMode,
      targetUnit: strategy.targetUnit,
      fixedStopLoss: strategy.fixedStopLoss,
      fixedTakeProfits: strategy.fixedTakeProfits,
      riskRewardGoal: strategy.riskRewardGoal,
    });
  const sharesTargetPlan = linkedStrategies.every(
    (strategy) => targetPlanKey(strategy) === targetPlanKey(first),
  );

  return {
    ...first,
    id: linkedStrategies.map((strategy) => strategy.id).join("+"),
    name: linkedStrategies.map((strategy) => strategy.name).join(", "),
    currencyPairs: uniqueValues((strategy) => strategy.currencyPairs),
    keyLevels: uniqueValues((strategy) => strategy.keyLevels),
    entryConditions: uniqueValues((strategy) => strategy.entryConditions),
    exitConditions: uniqueValues((strategy) => strategy.exitConditions),
    ...(sharesTargetPlan
      ? {}
      : {
          targetMode: "custom" as const,
          fixedStopLoss: null,
          fixedTakeProfits: [],
          riskRewardGoal: null,
        }),
  };
}

export function strategyTargetInputs(strategy: Strategy | null) {
  if (strategy?.targetMode === "fixed") {
    return {
      stopLoss: String(strategy.fixedStopLoss ?? ""),
      takeProfits:
        strategy.fixedTakeProfits.length > 0
          ? strategy.fixedTakeProfits.map(String)
          : [""],
    };
  }

  const targetCount =
    strategy?.targetMode === "risk-reward"
      ? Math.max(strategy.riskRewardGoal ?? 1, 1)
      : 1;
  return {
    stopLoss: "",
    takeProfits: Array.from({ length: targetCount }, () => ""),
  };
}

export function resolveTargetPlan({
  strategy,
  preferredUnit,
  instrument,
  entryPrice,
  direction,
  stopLossInput,
  takeProfitInputs,
}: {
  strategy: Strategy | null;
  preferredUnit: TradeTargetUnit;
  instrument: string;
  entryPrice: string;
  direction: TradeDirection;
  stopLossInput: string;
  takeProfitInputs: string[];
}): ResolvedTargetPlan {
  const mode = strategy?.targetMode ?? "custom";
  const unit =
    mode === "fixed" ? (strategy?.targetUnit ?? preferredUnit) : preferredUnit;
  const stopLoss = stopLossInput.trim()
    ? calculateTradeTarget({
        instrument,
        entryPrice,
        entryPriceInput: entryPrice,
        direction,
        kind: "stop-loss",
        unit,
        input: stopLossInput,
      })
    : null;

  if (mode === "risk-reward") {
    const goal = Math.max(strategy?.riskRewardGoal ?? 1, 1);
    const targets = calculateRiskRewardTargets({
      instrument,
      entryPrice,
      entryPriceInput: entryPrice,
      direction,
      stopLoss: stopLoss?.price ?? null,
      goal,
    });
    return {
      mode,
      unit,
      stopLoss,
      takeProfits: Array.from({ length: goal }, (_, index) => {
        const target = targets[index] ?? null;
        return {
          input: tradeTargetInputFromPrice({
            instrument,
            entryPrice,
            entryPriceInput: entryPrice,
            targetPrice: target?.price ?? null,
            unit,
          }),
          price: target?.price ?? null,
          riskRewardRatio: target?.ratio ?? null,
        };
      }),
    };
  }

  return {
    mode,
    unit,
    stopLoss,
    takeProfits: takeProfitInputs.map((input) => {
      const calculation = input.trim()
        ? calculateTradeTarget({
            instrument,
            entryPrice,
            entryPriceInput: entryPrice,
            direction,
            kind: "take-profit",
            unit,
            input,
          })
        : null;
      return {
        input,
        price: calculation?.price ?? null,
        riskRewardRatio: calculateRiskRewardRatio({
          entryPrice,
          stopLoss: stopLoss?.price ?? null,
          takeProfit: calculation?.price ?? null,
        }),
      };
    }),
  };
}
