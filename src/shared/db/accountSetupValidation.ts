import { isInstrumentSymbol, type TradeTargetUnit } from "../tradeInstruments";

export type AccountTypeValue = "live" | "demo" | "backtesting" | "system";
export type StrategyTargetMode = "fixed" | "risk-reward" | "custom";

export type StrategySetupInput = {
  name: string;
  strategy: string;
  entryRules: string;
  slTpRules: string;
  invalidationRules: string;
  currencyPairs: string[];
  keyLevels: string[];
  entryConditions: string[];
  exitConditions: string[];
  targetMode: StrategyTargetMode;
  targetUnit: TradeTargetUnit;
  fixedStopLoss: number | null;
  fixedTakeProfits: number[];
  riskRewardGoal: number | null;
};

export type EducatorSetupInput = {
  name: string;
  community: string;
  notes: string;
  strategyIds: string[];
};

export type RiskPlanSetupInput = {
  name: string;
  riskPerTradeMinPercent: number | null;
  riskPerTradeMaxPercent: number | null;
  riskPerDayMinPercent: number | null;
  riskPerDayMidPercent: number | null;
  riskPerDayMaxPercent: number | null;
  riskPerWeekMinPercent: number | null;
  riskPerWeekMaxPercent: number | null;
  maxTradesPerDay: number | null;
  maxLosingTradesPerDay: number | null;
  maxLosingDaysInRow: number | null;
  dailyGoalMinPercent: number | null;
  dailyGoalMaxPercent: number | null;
  weeklyGoalMinPercent: number | null;
  weeklyGoalMidPercent: number | null;
  weeklyGoalMaxPercent: number | null;
  notes: string;
};

export type TradingAccountSetupInput = {
  name: string;
  startingBalance: number;
  commission: number;
  currency: string;
  accountType: AccountTypeValue;
  strategyIds: string[];
  educatorIds: string[];
  riskPlanId: string | null;
};

function requirePositive(label: string, value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} is required and must be higher than 0.`);
  }
}

function requirePositiveInteger(label: string, value: number | null) {
  requirePositive(label, value);
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number.`);
  }
}

function validateRange(label: string, min: number, max: number) {
  if (min > max) {
    throw new Error(`${label}: min cannot be higher than max.`);
  }
}

function validateTripleRange(
  label: string,
  min: number,
  mid: number,
  max: number,
) {
  validateRange(label, min, max);
  if (min > mid) {
    throw new Error(`${label}: min cannot be higher than mid.`);
  }
  if (mid > max) {
    throw new Error(`${label}: mid cannot be higher than max.`);
  }
}

export function validateStrategySetup(input: StrategySetupInput) {
  if (!input.name.trim()) throw new Error("Strategy name is required.");
  if (input.currencyPairs.some((symbol) => !isInstrumentSymbol(symbol))) {
    throw new Error(
      "Instrument symbols must use 3 to 20 letters or numbers, for example EURUSD or NAS100.",
    );
  }
  if (input.targetMode === "fixed") {
    if (
      input.fixedStopLoss === null ||
      !Number.isFinite(input.fixedStopLoss) ||
      input.fixedStopLoss <= 0
    ) {
      throw new Error("Fixed stop loss is required and must be higher than 0.");
    }
    if (input.fixedTakeProfits.length === 0) {
      throw new Error("Add at least one fixed take profit.");
    }
    if (
      input.fixedTakeProfits.some(
        (value) => !Number.isFinite(value) || value <= 0,
      )
    ) {
      throw new Error("Every fixed take profit must be higher than 0.");
    }
  }
  if (
    input.targetMode === "risk-reward" &&
    (input.riskRewardGoal === null ||
      !Number.isInteger(input.riskRewardGoal) ||
      input.riskRewardGoal < 1 ||
      input.riskRewardGoal > 20)
  ) {
    throw new Error("Main RR goal must be a whole number from 1 to 20.");
  }
}

export function validateEducatorSetup(input: EducatorSetupInput) {
  if (!input.name.trim()) throw new Error("Educator name is required.");
}

export function validateTradingAccountSetup(input: TradingAccountSetupInput) {
  if (!input.name.trim()) throw new Error("Account name is required.");
  if (!Number.isFinite(input.startingBalance) || input.startingBalance < 0) {
    throw new Error("Starting balance must be 0 or higher.");
  }
  if (!Number.isFinite(input.commission) || input.commission < 0) {
    throw new Error("Commission is required and must be 0 or higher.");
  }
  if (!input.currency.trim()) throw new Error("Currency is required.");
  if (
    input.accountType !== "system" &&
    input.strategyIds.filter(Boolean).length === 0
  ) {
    throw new Error("Select at least one strategy.");
  }
  if (
    input.accountType === "system" &&
    input.educatorIds.filter(Boolean).length === 0
  ) {
    throw new Error("Select at least one educator.");
  }
  if (input.accountType === "live" && !input.riskPlanId) {
    throw new Error("Live accounts need one risk management plan.");
  }
}

export function validateRiskPlanSetup(input: RiskPlanSetupInput) {
  if (!input.name.trim()) throw new Error("Risk plan name is required.");

  requirePositive("Risk per trade min", input.riskPerTradeMinPercent);
  requirePositive("Risk per trade max", input.riskPerTradeMaxPercent);
  requirePositive("Risk per day min", input.riskPerDayMinPercent);
  requirePositive("Risk per day mid", input.riskPerDayMidPercent);
  requirePositive("Risk per day max", input.riskPerDayMaxPercent);
  requirePositive("Risk per week min", input.riskPerWeekMinPercent);
  requirePositive("Risk per week max", input.riskPerWeekMaxPercent);
  requirePositiveInteger("Max trades per day", input.maxTradesPerDay);
  requirePositiveInteger(
    "Max losing trades per day",
    input.maxLosingTradesPerDay,
  );
  requirePositiveInteger("Max losing days in a row", input.maxLosingDaysInRow);
  requirePositive("Daily goal min", input.dailyGoalMinPercent);
  requirePositive("Daily goal max", input.dailyGoalMaxPercent);
  requirePositive("Weekly goal min", input.weeklyGoalMinPercent);
  requirePositive("Weekly goal mid", input.weeklyGoalMidPercent);
  requirePositive("Weekly goal max", input.weeklyGoalMaxPercent);

  validateRange(
    "Risk per trade",
    input.riskPerTradeMinPercent!,
    input.riskPerTradeMaxPercent!,
  );
  validateTripleRange(
    "Risk per day",
    input.riskPerDayMinPercent!,
    input.riskPerDayMidPercent!,
    input.riskPerDayMaxPercent!,
  );
  validateRange(
    "Risk per week",
    input.riskPerWeekMinPercent!,
    input.riskPerWeekMaxPercent!,
  );
  validateRange(
    "Daily goal",
    input.dailyGoalMinPercent!,
    input.dailyGoalMaxPercent!,
  );
  validateTripleRange(
    "Weekly goal",
    input.weeklyGoalMinPercent!,
    input.weeklyGoalMidPercent!,
    input.weeklyGoalMaxPercent!,
  );
}
