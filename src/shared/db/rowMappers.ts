import type { TradeTargetUnit } from "../tradeInstruments";
import type {
  BacktestTarget,
  Educator,
  EducatorRow,
  EntryData,
  ExitData,
  NewTrade,
  RecapRow,
  RiskManagementPlan,
  RiskManagementPlanRow,
  ScreenshotRow,
  Strategy,
  StrategyRow,
  StrategyTargetMode,
  Trade,
  TradeRecap,
  TradeRecapGrade,
  TradeRecapPlanFollowed,
  TradeResult,
  TradeRow,
  TradeStatus,
  TradingAccount,
  TradingAccountRow,
} from "./models";

function normalizedResult(value: string): TradeResult {
  if (value === "win" || value === "loss" || value === "break-even") {
    return value;
  }
  return "";
}

export function normalizedRecapGrade(value: string): TradeRecapGrade {
  if (value === "A" || value === "B" || value === "C" || value === "D") {
    return value;
  }
  return "";
}

export function normalizedPlanFollowed(value: string): TradeRecapPlanFollowed {
  if (value === "yes" || value === "partial" || value === "no") return value;
  return "";
}

function stringArrayFromJson(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Older local rows can contain plain text; keep them from breaking reads.
  }
  return [];
}

function numberArrayFromJson(value: string): number[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is number =>
        typeof item === "number" && Number.isFinite(item),
    );
  } catch {
    return [];
  }
}

function normalizedStrategyTargetMode(value: string): StrategyTargetMode {
  if (value === "fixed" || value === "risk-reward") return value;
  return "custom";
}

function normalizedTradeTargetUnit(value: string): TradeTargetUnit {
  if (value === "points" || value === "pips" || value === "ticks") {
    return value;
  }
  return "price";
}

function backtestTargetsFromJson(value: string): BacktestTarget[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const target = item as { takeProfit?: unknown; result?: unknown };
      const takeProfit =
        typeof target.takeProfit === "number" &&
        Number.isFinite(target.takeProfit)
          ? target.takeProfit
          : null;
      const result =
        typeof target.result === "string"
          ? normalizedResult(target.result)
          : "";
      return [{ takeProfit, result }];
    });
  } catch {
    return [];
  }
}

export function recapRowToRecap(row: RecapRow): TradeRecap {
  return {
    id: row.id,
    tradeId: row.trade_id,
    grade: normalizedRecapGrade(row.grade),
    followedPlan: normalizedPlanFollowed(row.followed_plan),
    setupQuality: row.setup_quality,
    entryQuality: row.entry_quality,
    managementQuality: row.management_quality,
    exitQuality: row.exit_quality,
    mistakeTags: stringArrayFromJson(row.mistake_tags),
    positiveTags: stringArrayFromJson(row.positive_tags),
    emotionTag: row.emotion_tag ?? "",
    ruleBroken: row.rule_broken === 1,
    lesson: row.lesson ?? "",
    nextAction: row.next_action ?? "",
    body: row.body ?? "",
    createdAt: row.created_at,
  };
}

export function rowToTrade(
  row: TradeRow,
  recap: TradeRecap | null,
  screenshots: ScreenshotRow[],
): Trade {
  return {
    id: row.id,
    accountId: row.account_id,
    date: row.trade_date,
    pair: row.pair,
    direction: row.direction,
    status: row.status,
    preTrade: {
      strategy: row.pre_strategy ?? "",
      keyLevel: row.key_level ?? "",
      entryCondition: row.entry_condition ?? "",
      riskPercent: row.risk_percent,
      riskAmount: row.risk_amount,
      bias: row.pre_bias ?? "",
      notes: row.pre_notes ?? "",
      feeling: row.pre_feeling,
    },
    entry: {
      time: row.entry_time,
      price: row.entry_price,
      lotSize: row.entry_size,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      takeProfits: (() => {
        const targets = numberArrayFromJson(row.take_profit_targets ?? "[]");
        return targets.length > 0
          ? targets
          : row.take_profit === null
            ? []
            : [row.take_profit];
      })(),
      notes: row.entry_notes ?? "",
      confidence: row.entry_confidence,
    },
    exit: {
      price: row.exit_price,
      result: normalizedResult(row.exit_result ?? ""),
      note: row.exit_reason ?? "",
      feeling: row.exit_feeling,
      time: row.exit_time,
      exitCondition: row.exit_condition ?? "",
    },
    pnl: row.pnl,
    backtestSessionId: row.backtest_session_id,
    backtestTestedAt: row.backtest_tested_at,
    backtestTargets: backtestTargetsFromJson(row.backtest_targets ?? "[]"),
    hasRecap: recap !== null,
    recap,
    screenshots,
  };
}

function hasEntryData(entry: EntryData): boolean {
  return Boolean(
    entry.time ||
    entry.notes.trim() ||
    entry.price !== null ||
    entry.lotSize !== null ||
    entry.stopLoss !== null ||
    entry.takeProfit !== null ||
    entry.takeProfits.length > 0 ||
    entry.confidence !== null,
  );
}

function hasExitData(exit: ExitData, pnl: number | null): boolean {
  return Boolean(
    exit.note.trim() ||
    exit.time ||
    exit.result ||
    exit.price !== null ||
    exit.feeling !== null ||
    pnl !== null,
  );
}

export function deriveStatus(input: NewTrade): TradeStatus {
  if (input.status) return input.status;
  if (hasExitData(input.exit, input.pnl)) return "closed";
  if (hasEntryData(input.entry)) return "open";
  return "pre-trade";
}

export function rowToRiskPlan(row: RiskManagementPlanRow): RiskManagementPlan {
  return {
    id: row.id,
    name: row.name,
    riskPercent: row.risk_percent,
    maxDailyLossPercent: row.max_daily_loss_percent,
    riskPerTradeMinPercent: row.risk_per_trade_min_percent,
    riskPerTradeMaxPercent: row.risk_per_trade_max_percent ?? row.risk_percent,
    riskPerDayMinPercent: row.risk_per_day_min_percent,
    riskPerDayMidPercent: row.risk_per_day_mid_percent,
    riskPerDayMaxPercent:
      row.risk_per_day_max_percent ?? row.max_daily_loss_percent,
    riskPerWeekMinPercent: row.risk_per_week_min_percent,
    riskPerWeekMaxPercent: row.risk_per_week_max_percent,
    maxTradesPerDay: row.max_trades_per_day,
    maxLosingTradesPerDay: row.max_losing_trades_per_day,
    maxLosingDaysInRow: row.max_losing_days_in_row,
    dailyGoalMinPercent: row.daily_goal_min_percent,
    dailyGoalMaxPercent: row.daily_goal_max_percent,
    weeklyGoalMinPercent: row.weekly_goal_min_percent,
    weeklyGoalMidPercent: row.weekly_goal_mid_percent,
    weeklyGoalMaxPercent: row.weekly_goal_max_percent,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export function rowToStrategy(row: StrategyRow): Strategy {
  return {
    id: row.id,
    name: row.name,
    strategy: row.strategy,
    entryRules: row.entry_rules,
    slTpRules: row.sl_tp_rules,
    invalidationRules: row.invalidation_rules,
    currencyPairs: stringArrayFromJson(row.currency_pairs ?? "[]"),
    keyLevels: stringArrayFromJson(row.key_levels ?? "[]"),
    entryConditions: stringArrayFromJson(row.entry_conditions ?? "[]"),
    exitConditions: stringArrayFromJson(row.exit_conditions ?? "[]"),
    targetMode: normalizedStrategyTargetMode(row.target_plan_mode ?? "custom"),
    targetUnit: normalizedTradeTargetUnit(row.target_unit ?? "price"),
    fixedStopLoss: row.fixed_stop_loss,
    fixedTakeProfits: numberArrayFromJson(row.fixed_take_profits ?? "[]"),
    riskRewardGoal: row.risk_reward_goal,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export function rowToEducator(
  row: EducatorRow,
  linkedStrategyIds: string[],
): Educator {
  const strategyIds = Array.from(
    new Set([
      ...linkedStrategyIds,
      ...(row.strategy_id ? [row.strategy_id] : []),
    ]),
  );
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    notes: row.notes,
    strategyIds,
    created_at: row.created_at,
  };
}

export function rowToAccount(
  row: TradingAccountRow,
  strategyIds: string[],
  educatorIds: string[],
): TradingAccount {
  return {
    id: row.id,
    name: row.name,
    startingBalance: row.starting_balance,
    commission: row.commission,
    currency: row.currency,
    accountType: row.account_type,
    strategyIds,
    educatorIds,
    riskPlanId: row.risk_plan_id,
    created_at: row.created_at,
  };
}
