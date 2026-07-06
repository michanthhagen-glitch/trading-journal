import {
  formatCurrencyValue,
  formatNumberValue,
  startOfWeekByPreference,
  type AppPreferences,
} from "./appPreferences";
import type { RiskManagementPlan, Trade, TradingAccount } from "./db/database";

export type TradingPlanTone =
  | "alarm"
  | "danger"
  | "neutral"
  | "safe"
  | "success"
  | "warning";

export type TradingPlanToken = {
  amountLabel: string;
  label: string;
  percentLabel: string;
  targetLabel: string | null;
  title: string;
  tone: TradingPlanTone;
};

export type TradingPlanRule = {
  label: string;
  title: string;
  tone: TradingPlanTone;
  value: string;
};

export type TradingPlanSidebarInfo = {
  balanceLabel: string;
  goal: {
    day: TradingPlanToken[];
    week: TradingPlanToken[];
  };
  planLabel: string;
  risk: {
    day: TradingPlanToken[];
    trade: TradingPlanToken[];
    week: TradingPlanToken[];
  };
  rules: TradingPlanRule[];
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isClosedTrade(trade: Trade) {
  return Boolean(trade.exit.result) || trade.pnl !== null;
}

function tradeNetPnl(trade: Trade, commissionPerLot: number) {
  return (trade.pnl ?? 0) - (trade.entry.lotSize ?? 0) * commissionPerLot;
}

function tradeTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "99:99";
}

function tradeSortValue(trade: Trade) {
  return `${trade.date} ${tradeTime(trade)}`;
}

function netPnlBefore(trades: Trade[], cutoffDate: string, commission: number) {
  return trades
    .filter((trade) => isClosedTrade(trade) && trade.date < cutoffDate)
    .reduce((sum, trade) => sum + tradeNetPnl(trade, commission), 0);
}

function netPnlBetween(
  trades: Trade[],
  startDate: string,
  endDate: string,
  commission: number,
) {
  return trades
    .filter(
      (trade) =>
        isClosedTrade(trade) &&
        trade.date >= startDate &&
        trade.date <= endDate,
    )
    .reduce((sum, trade) => sum + tradeNetPnl(trade, commission), 0);
}

function netPnlTotal(trades: Trade[], commission: number) {
  return trades
    .filter(isClosedTrade)
    .reduce((sum, trade) => sum + tradeNetPnl(trade, commission), 0);
}

function midpoint(
  min: number | null | undefined,
  max: number | null | undefined,
) {
  return min == null || max == null ? null : (min + max) / 2;
}

function percentLabel(value: number | null, preferences: AppPreferences) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${formatNumberValue(value, preferences, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}%`;
}

function moneyLabel(
  value: number | null,
  currency: string,
  preferences: AppPreferences,
  signed = false,
  wholeOnly = false,
) {
  if (value == null || !Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const whole = wholeOnly || abs >= 1000 || Number.isInteger(abs);

  return formatCurrencyValue(value, currency, preferences, {
    maximumFractionDigits: whole ? 0 : 2,
    minimumFractionDigits: whole ? 0 : 2,
    signed,
  });
}

function emptyToken(label: string): TradingPlanToken {
  return {
    amountLabel: "-",
    label,
    percentLabel: "-",
    targetLabel: null,
    title: "Not set.",
    tone: "neutral",
  };
}

function tradeRiskToken(
  label: string,
  percent: number | null | undefined,
  balance: number,
  currency: string,
  preferences: AppPreferences,
): TradingPlanToken {
  if (percent == null || !Number.isFinite(percent)) return emptyToken(label);

  const amount = balance * (percent / 100);
  const amountLabel = moneyLabel(amount, currency, preferences);
  const percentText = percentLabel(percent, preferences);

  return {
    amountLabel,
    label,
    percentLabel: percentText,
    targetLabel: null,
    title: `${label}: ${percentText} of current balance ${moneyLabel(balance, currency, preferences)} = ${amountLabel}.`,
    tone: "neutral",
  };
}

function targetToken(
  label: string,
  percent: number | null | undefined,
  balance: number,
  currency: string,
  preferences: AppPreferences,
  mode: "goal" | "risk",
  currentBalance: number,
): TradingPlanToken {
  if (percent == null || !Number.isFinite(percent)) return emptyToken(label);

  const amount = balance * (percent / 100);
  const target = mode === "goal" ? balance + amount : balance - amount;
  const amountLabel = moneyLabel(
    mode === "goal" ? amount : -amount,
    currency,
    preferences,
    true,
    true,
  );
  const targetLabel = moneyLabel(target, currency, preferences);
  const percentText = percentLabel(percent, preferences);
  const direction = mode === "goal" ? "target" : "limit";
  const tone: TradingPlanTone =
    mode === "goal"
      ? currentBalance >= target
        ? "success"
        : "neutral"
      : currentBalance <= target
        ? "danger"
        : "neutral";

  return {
    amountLabel,
    label,
    percentLabel: percentText,
    targetLabel,
    title: `${label}: ${percentText} ${direction} from ${moneyLabel(balance, currency, preferences)} gives ${amountLabel} and ${targetLabel}.`,
    tone,
  };
}

function ruleTone(
  current: number,
  max: number | null | undefined,
): TradingPlanTone {
  if (max == null || !Number.isFinite(max)) return "neutral";
  if (current < max) return "safe";
  if (current === max) return "warning";
  return "alarm";
}

function countRule(
  label: string,
  title: string,
  current: number,
  max: number | null | undefined,
): TradingPlanRule {
  const hasMax = max != null && Number.isFinite(max);

  return {
    label,
    title: hasMax ? `${title} Current: ${current}/${max}.` : title,
    tone: ruleTone(current, max),
    value: hasMax ? `${current}/${max}` : "-",
  };
}

function isLosingTrade(trade: Trade) {
  return trade.exit.result === "loss" || (trade.pnl ?? 0) < 0;
}

function currentDayLossStreak(trades: Trade[], todayKey: string) {
  return trades
    .filter((trade) => isClosedTrade(trade) && trade.date === todayKey)
    .sort((a, b) => tradeSortValue(a).localeCompare(tradeSortValue(b)))
    .reduce((streak, trade) => (isLosingTrade(trade) ? streak + 1 : 0), 0);
}

function currentWeekLosingDayStreak(
  trades: Trade[],
  weekStartKey: string,
  todayKey: string,
  commission: number,
) {
  const dayPnl = new Map<string, number>();

  for (const trade of trades.filter(
    (row) =>
      isClosedTrade(row) && row.date >= weekStartKey && row.date <= todayKey,
  )) {
    dayPnl.set(
      trade.date,
      (dayPnl.get(trade.date) ?? 0) + tradeNetPnl(trade, commission),
    );
  }

  return Array.from(dayPnl.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((streak, [, pnl]) => (pnl < 0 ? streak + 1 : 0), 0);
}

export function buildTradingPlanSidebarInfo({
  account,
  appPreferences,
  now,
  riskPlan,
  trades,
}: {
  account: TradingAccount | null;
  appPreferences: AppPreferences;
  now: Date;
  riskPlan: RiskManagementPlan | null;
  trades: Trade[];
}): TradingPlanSidebarInfo {
  const currency = account?.currency ?? "USD";
  const startBalance = account?.startingBalance ?? 0;
  const commission = account?.commission ?? 0;
  const todayKey = dateKey(now);
  const weekStartKey = dateKey(startOfWeekByPreference(now, appPreferences));
  const currentBalance = account
    ? startBalance + netPnlTotal(trades, commission)
    : null;
  const dayStartBalance = account
    ? startBalance + netPnlBefore(trades, todayKey, commission)
    : 0;
  const weekStartBalance = account
    ? startBalance + netPnlBefore(trades, weekStartKey, commission)
    : 0;
  const dayCurrentBalance =
    dayStartBalance + netPnlBetween(trades, todayKey, todayKey, commission);
  const weekCurrentBalance =
    weekStartBalance +
    netPnlBetween(trades, weekStartKey, todayKey, commission);
  const todayTrades = trades.filter((trade) => trade.date === todayKey).length;
  const lossStreak = currentDayLossStreak(trades, todayKey);
  const losingDayStreak = currentWeekLosingDayStreak(
    trades,
    weekStartKey,
    todayKey,
    commission,
  );
  const planName = riskPlan?.name ?? (account ? "No risk plan" : "No account");
  const tradeRiskMin = riskPlan?.riskPerTradeMinPercent ?? null;
  const tradeRiskMax =
    riskPlan?.riskPerTradeMaxPercent ?? riskPlan?.riskPercent ?? null;
  const weekRiskMin = riskPlan?.riskPerWeekMinPercent ?? null;
  const weekRiskMax = riskPlan?.riskPerWeekMaxPercent ?? null;
  const dailyGoalMin = riskPlan?.dailyGoalMinPercent ?? null;
  const dailyGoalMax = riskPlan?.dailyGoalMaxPercent ?? null;

  return {
    balanceLabel: moneyLabel(currentBalance, currency, appPreferences),
    goal: {
      day: [
        targetToken(
          "Min",
          dailyGoalMin,
          dayStartBalance,
          currency,
          appPreferences,
          "goal",
          dayCurrentBalance,
        ),
        targetToken(
          "Mid",
          midpoint(dailyGoalMin, dailyGoalMax),
          dayStartBalance,
          currency,
          appPreferences,
          "goal",
          dayCurrentBalance,
        ),
        targetToken(
          "Max",
          dailyGoalMax,
          dayStartBalance,
          currency,
          appPreferences,
          "goal",
          dayCurrentBalance,
        ),
      ],
      week: [
        targetToken(
          "Min",
          riskPlan?.weeklyGoalMinPercent,
          weekStartBalance,
          currency,
          appPreferences,
          "goal",
          weekCurrentBalance,
        ),
        targetToken(
          "Mid",
          riskPlan?.weeklyGoalMidPercent,
          weekStartBalance,
          currency,
          appPreferences,
          "goal",
          weekCurrentBalance,
        ),
        targetToken(
          "Max",
          riskPlan?.weeklyGoalMaxPercent,
          weekStartBalance,
          currency,
          appPreferences,
          "goal",
          weekCurrentBalance,
        ),
      ],
    },
    planLabel: planName,
    risk: {
      day: [
        targetToken(
          "Min",
          riskPlan?.riskPerDayMinPercent,
          dayStartBalance,
          currency,
          appPreferences,
          "risk",
          dayCurrentBalance,
        ),
        targetToken(
          "Mid",
          riskPlan?.riskPerDayMidPercent,
          dayStartBalance,
          currency,
          appPreferences,
          "risk",
          dayCurrentBalance,
        ),
        targetToken(
          "Max",
          riskPlan?.riskPerDayMaxPercent,
          dayStartBalance,
          currency,
          appPreferences,
          "risk",
          dayCurrentBalance,
        ),
      ],
      trade: [
        tradeRiskToken(
          "Min",
          tradeRiskMin,
          currentBalance ?? 0,
          currency,
          appPreferences,
        ),
        tradeRiskToken(
          "Max",
          tradeRiskMax,
          currentBalance ?? 0,
          currency,
          appPreferences,
        ),
      ],
      week: [
        targetToken(
          "Min",
          weekRiskMin,
          weekStartBalance,
          currency,
          appPreferences,
          "risk",
          weekCurrentBalance,
        ),
        targetToken(
          "Mid",
          midpoint(weekRiskMin, weekRiskMax),
          weekStartBalance,
          currency,
          appPreferences,
          "risk",
          weekCurrentBalance,
        ),
        targetToken(
          "Max",
          weekRiskMax,
          weekStartBalance,
          currency,
          appPreferences,
          "risk",
          weekCurrentBalance,
        ),
      ],
    },
    rules: [
      countRule(
        "Trades/day",
        "Maximum trades allowed per day.",
        todayTrades,
        riskPlan?.maxTradesPerDay,
      ),
      countRule(
        "Loss streak/day",
        "Maximum losing trades in a row per day.",
        lossStreak,
        riskPlan?.maxLosingTradesPerDay,
      ),
      countRule(
        "Loss days/week",
        "Maximum losing days in a row per week.",
        losingDayStreak,
        riskPlan?.maxLosingDaysInRow,
      ),
    ],
  };
}
