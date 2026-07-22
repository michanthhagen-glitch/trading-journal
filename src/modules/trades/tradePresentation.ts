import type {
  EntryData,
  RiskManagementPlan,
  Trade,
  TradeResult,
  TradingAccount,
} from "../../shared/db/database";
import {
  formatCurrencyValue,
  formatDateRangeValue,
  formatDateTimeValue,
  formatPercentValue,
  formatWeekdayDateValue,
  startOfWeekByPreference,
  type AppPreferences,
} from "../../shared/appPreferences";
import { parseTradeNumber as parseNumber } from "./strategyWorkflow";
import {
  addDays,
  addMonths,
  dateKey,
  firstOfMonth,
  sameMonth,
} from "../../shared/localDates";

export { addMonths, dateKey, firstOfMonth, sameMonth };

export function tradeSourceLabel(account: TradingAccount | null) {
  return account?.accountType === "system" ? "Educator" : "Strategy";
}

export function resultLabel(result: TradeResult) {
  switch (result) {
    case "win":
      return "Win";
    case "loss":
      return "Loss";
    case "break-even":
      return "Break-even";
    default:
      return "—";
  }
}

export function resultShortLabel(result: TradeResult) {
  switch (result) {
    case "win":
      return "Win";
    case "loss":
      return "Loss";
    case "break-even":
      return "BE";
    default:
      return "—";
  }
}

export function directionActionLabel(direction: Trade["direction"]) {
  return direction === "long" ? "Long" : "Short";
}

export function fmtMoney(
  value: number | null,
  currency: string,
  appPreferences: AppPreferences,
) {
  return formatCurrencyValue(value, currency, appPreferences);
}

export function fmtPnl(
  pnl: number | null,
  currency: string,
  appPreferences: AppPreferences,
) {
  if (pnl === null) return "—";
  return formatCurrencyValue(pnl, currency, appPreferences, { signed: true });
}

export function fmtPercent(
  value: number | null,
  appPreferences: AppPreferences,
) {
  return formatPercentValue(value, appPreferences);
}

export function fmtPrice(value: number | null) {
  return value === null ? "—" : String(value);
}

export function pnlToneClass(pnl: number | null) {
  if (pnl === null) return "";
  if (pnl > 0) return "positive";
  if (pnl < 0) return "negative";
  return "flat";
}

export function fmtRMultiple(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}R`;
}

export function parseTradeTime(value: string | null): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function tradeDuration(trade: Trade) {
  const entry = parseTradeTime(trade.entry.time);
  const exit = parseTradeTime(trade.exit.time);
  if (entry === null || exit === null) return "—";

  const minutes = exit >= entry ? exit - entry : exit + 24 * 60 - entry;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function tradeListTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "—";
}

export function tradeListDateTime(
  trade: Trade,
  appPreferences: AppPreferences,
) {
  return formatDateTimeValue(trade.date, tradeListTime(trade), appPreferences);
}

export function parseTradeDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return new Date();
  return new Date(year, month - 1, day);
}

export function startOfWeek(date: Date, appPreferences: AppPreferences) {
  return startOfWeekByPreference(date, appPreferences);
}

export function calendarDays(month: Date, appPreferences: AppPreferences) {
  const start = startOfWeek(firstOfMonth(month), appPreferences);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatWeekLabel(start: Date, appPreferences: AppPreferences) {
  const end = addDays(start, 6);
  return formatDateRangeValue(start, end, appPreferences);
}

export function tradePnlTotal(trades: Trade[]) {
  const hasPnl = trades.some((trade) => trade.pnl !== null);
  if (!hasPnl) return null;
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
}

export function missingRecapCount(trades: Trade[]) {
  return trades.filter((trade) => !trade.hasRecap).length;
}

export function plannedRiskReward(trade: Trade): number | null {
  const { price, stopLoss } = trade.entry;
  const takeProfit = primaryTakeProfit(trade.entry);
  if (price === null || stopLoss === null || takeProfit === null) return null;

  const risk = Math.abs(price - stopLoss);
  const reward = Math.abs(takeProfit - price);
  if (risk <= 0 || reward < 0) return null;
  return reward / risk;
}

export function primaryTakeProfit(entry: EntryData) {
  return entry.takeProfits.length > 0
    ? entry.takeProfits[entry.takeProfits.length - 1]
    : entry.takeProfit;
}

export function displayTakeProfits(entry: EntryData) {
  return entry.takeProfits.length > 0
    ? entry.takeProfits
    : entry.takeProfit === null
      ? []
      : [entry.takeProfit];
}

export function actualRiskReward(trade: Trade): number | null {
  const { price, stopLoss } = trade.entry;
  const exitPrice = trade.exit.price;
  if (price === null || stopLoss === null || exitPrice === null) return null;

  const risk = Math.abs(price - stopLoss);
  if (risk <= 0) return null;

  const move =
    trade.direction === "long" ? exitPrice - price : price - exitPrice;
  return move / risk;
}

export function formatFormNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function accountNetPnl(trades: Trade[]) {
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
}

export function accountBalance(
  account: TradingAccount | null,
  trades: Trade[],
) {
  return account ? account.startingBalance + accountNetPnl(trades) : null;
}

export function tradeBalanceSummary(
  account: TradingAccount | null,
  trades: Trade[],
  trade: Trade,
) {
  if (!account) {
    return { before: null, after: null, growthPercent: null };
  }

  const tradeIndex = trades.findIndex((row) => row.id === trade.id);
  // Trades are loaded newest first, so rows after this one are older trades.
  const olderTrades = tradeIndex >= 0 ? trades.slice(tradeIndex + 1) : [];
  const before = account.startingBalance + accountNetPnl(olderTrades);
  const after = trade.pnl === null ? null : before + trade.pnl;
  const growthPercent =
    after === null || before === 0 ? null : ((after - before) / before) * 100;

  return { before, after, growthPercent };
}

export function dayBalanceSummary(
  account: TradingAccount | null,
  trades: Trade[],
  dayKey: string,
) {
  const dayTrades = trades.filter((trade) => trade.date === dayKey);
  const pnl = tradePnlTotal(dayTrades);

  if (!account) {
    return { before: null, after: null, growthPercent: null, pnl };
  }

  const olderTrades = trades.filter((trade) => trade.date < dayKey);
  const before = account.startingBalance + accountNetPnl(olderTrades);
  const after = pnl === null ? null : before + pnl;
  const growthPercent =
    after === null || before === 0 ? null : ((after - before) / before) * 100;

  return { before, after, growthPercent, pnl };
}

export function formatDayDialogTitle(
  value: string,
  appPreferences: AppPreferences,
) {
  return formatWeekdayDateValue(value, appPreferences);
}

export function riskPlanMin(plan: RiskManagementPlan | null) {
  return plan?.riskPerTradeMinPercent ?? null;
}

export function riskPlanMax(plan: RiskManagementPlan | null) {
  return plan?.riskPerTradeMaxPercent ?? plan?.riskPercent ?? null;
}

export function riskPlanRangeLabel(plan: RiskManagementPlan | null) {
  if (!plan) return "No risk plan connected.";
  const min = riskPlanMin(plan);
  const max = riskPlanMax(plan);
  if (min === null && max === null) return `${plan.name}: risk range not set.`;
  if (min === null) return `${plan.name}: up to ${max}% risk.`;
  if (max === null) return `${plan.name}: ${min}%+ risk.`;
  return `${plan.name}: ${min}-${max}% risk.`;
}

export function defaultRiskPercent(plan: RiskManagementPlan | null) {
  return riskPlanMin(plan) ?? riskPlanMax(plan);
}

export function calculateRiskAmount(
  balance: number | null,
  riskPercent: string,
) {
  const parsed = parseNumber(riskPercent);
  if (balance === null || parsed === null || !Number.isFinite(parsed))
    return "";
  return (balance * (parsed / 100)).toFixed(2);
}

export function padTimePart(value: number) {
  return value.toString().padStart(2, "0");
}

export function todayInputValue() {
  const now = new Date();
  return [
    now.getFullYear(),
    padTimePart(now.getMonth() + 1),
    padTimePart(now.getDate()),
  ].join("-");
}

export function currentTimeInputValue() {
  const now = new Date();
  return `${padTimePart(now.getHours())}:${padTimePart(now.getMinutes())}`;
}
