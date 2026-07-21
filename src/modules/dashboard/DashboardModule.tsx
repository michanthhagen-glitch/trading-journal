import { BarChart3, ChevronRight, LineChart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ModuleContext } from "../../app/types";
import { ModalShell } from "../../components/ModalShell";
import {
  listAccountSetup,
  listTrades,
  type Educator,
  type RiskManagementPlan,
  type Strategy,
  type Trade,
} from "../../shared/db/database";
import {
  dateTimeMinutesValue,
  dateTimeWeekdayShortLabel,
  formatCompactCurrencyValue,
  formatCompactDateValue,
  formatCurrencyValue,
  formatDateRangeValue,
  formatDateTimeValue,
  formatDateValue,
  formatPercentValue,
  orderedWeekdayLabels,
  startOfWeekByPreference,
  type AppPreferences,
  weekdayShortLabel,
} from "../../shared/appPreferences";
import { formatTradeName } from "../../shared/tradeNames";
import { BacktestingDashboard } from "./BacktestingDashboard";

type Tone = "flat" | "negative" | "positive" | "warning";
type Outcome = "break-even" | "empty" | "loss" | "win";
type SummaryScope = "month" | "total" | "week";
type DashboardTab = "month" | "statistics" | "total" | "week";

type HistoryPoint = {
  label: string;
  meta: string;
  pnl: number | null;
  value: number | null;
};

type RingSegment = {
  color: string;
  label: string;
  valueText: string;
  weight: number;
};

type OutcomePoint = {
  label: string;
  meta: string;
  outcome: Outcome;
  value: number;
};

type RateRow = {
  beRate: number | null;
  breakEvens: number;
  label: string;
  losses: number;
  lossRate: number | null;
  pnl: number;
  trades: number;
  winRate: number | null;
  wins: number;
};

type RateLeaders = {
  bestWin: RateRow | null;
  rows: RateRow[];
  worstWin: RateRow | null;
};

type RankingRow = {
  id: string;
  label: string;
  meta: string;
  trades: number;
  value: number;
};

type RankingStats = {
  losingDays: RankingRow[];
  losingMonths: RankingRow[];
  losingTrades: RankingRow[];
  losingWeeks: RankingRow[];
  winningDays: RankingRow[];
  winningMonths: RankingRow[];
  winningTrades: RankingRow[];
  winningWeeks: RankingRow[];
};

type MonthlyBalanceChart = {
  growth: number | null;
  id: string;
  label: string;
  points: HistoryPoint[];
};

type WeeklyBalanceCard = {
  id: string;
  label: string;
  points: HistoryPoint[];
  summary: SummaryData;
  weekNumber: number;
};

type SummaryData = {
  balance: number;
  breakEvens: number;
  closed: number;
  commission: number;
  endLabel: string;
  grossPnl: number;
  growth: number | null;
  id: SummaryScope;
  labels: {
    history: string;
    title: string;
  };
  losses: number;
  netPnl: number;
  open: number;
  outcomes: OutcomePoint[];
  rateGroups: {
    day: RateLeaders;
    direction: RateLeaders;
    pair: RateLeaders;
    session: RateLeaders;
    strategy: RateLeaders;
    time: RateLeaders;
  };
  startingBalance: number;
  trades: Trade[];
  wins: number;
};

type DetailState =
  | {
      rows: RateRow[];
      scope?: RateDetailScope;
      title: string;
      type: "rate";
    }
  | {
      rows: RankingRow[];
      title: string;
      type: "ranking";
    }
  | null;

const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "statistics", label: "Statistics" },
];

const DIRECTION_LABELS = ["Long", "Short"];
const RING_CIRCUMFERENCE = 263.89;
const SESSION_LABELS = [
  "Tokyo",
  "Tokyo-London",
  "London",
  "London/New York",
  "New York",
  "New York-Tokyo",
];
const TIME_INTERVAL_LABELS = Array.from({ length: 96 }, (_, index) =>
  timeIntervalLabel(index),
);
type RateDetailScope = "day" | "direction" | "session" | "time";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfWeek(date: Date, appPreferences: AppPreferences) {
  return startOfWeekByPreference(date, appPreferences);
}

function endOfWeek(date: Date, appPreferences: AppPreferences) {
  return addDays(startOfWeek(date, appPreferences), 6);
}

function weekNumber(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

function weekTickLabel(value: string) {
  const weekday = parseDate(value).getDay();
  return ["S", "M", "T", "W", "T", "F", "S"][weekday] ?? value.slice(5);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function monthLabel(date: Date, format: "long" | "short" = "long") {
  return new Intl.DateTimeFormat(undefined, {
    month: format,
    year: format === "long" ? "numeric" : undefined,
  }).format(date);
}

function isClosedTrade(trade: Trade) {
  return Boolean(trade.exit.result) || trade.pnl !== null;
}

function tradeTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "--:--";
}

function tradeSortValue(trade: Trade) {
  return `${trade.date} ${tradeTime(trade)}`;
}

function clockLabel(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

function timeIntervalLabel(index: number) {
  const start = index * 15;
  return `${clockLabel(start)}-${clockLabel(start + 15)}`;
}

function minutesFromTrade(trade: Trade, appPreferences: AppPreferences) {
  const preferredMinutes = dateTimeMinutesValue(
    trade.date,
    tradeTime(trade),
    appPreferences,
  );
  if (preferredMinutes !== null) return preferredMinutes;

  const [hour, minute] = tradeTime(trade).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return Math.max(0, Math.min(1439, hour * 60 + minute));
}

function hourFromTrade(trade: Trade, appPreferences: AppPreferences) {
  return Math.floor(minutesFromTrade(trade, appPreferences) / 60);
}

function sessionLabel(trade: Trade, appPreferences: AppPreferences) {
  const hour = hourFromTrade(trade, appPreferences);
  if (hour < 7) return "Tokyo";
  if (hour < 8) return "Tokyo-London";
  if (hour < 13) return "London";
  if (hour < 17) return "London/New York";
  if (hour < 21) return "New York";
  return "New York-Tokyo";
}

function timeOfDayLabel(trade: Trade, appPreferences: AppPreferences) {
  return TIME_INTERVAL_LABELS[
    Math.floor(minutesFromTrade(trade, appPreferences) / 15)
  ];
}

function dayLabel(trade: Trade, appPreferences: AppPreferences) {
  return (
    dateTimeWeekdayShortLabel(trade.date, tradeTime(trade), appPreferences) ??
    weekdayShortLabel(trade.date)
  );
}

function directionLabel(trade: Trade) {
  return trade.direction === "long" ? "Long" : "Short";
}

function pairLabel(trade: Trade) {
  return trade.pair.trim() || "No instrument";
}

function strategyLabel(trade: Trade) {
  return trade.preTrade.strategy.trim() || "Unassigned";
}

function fmtCurrency(
  value: number,
  currency: string,
  appPreferences: AppPreferences,
  signed = false,
) {
  return formatCurrencyValue(value, currency, appPreferences, { signed });
}

function fmtShortCurrency(
  value: number,
  currency: string,
  appPreferences: AppPreferences,
) {
  return formatCompactCurrencyValue(value, currency, appPreferences, {
    signed: true,
  });
}

function fmtAxisCurrency(
  value: number,
  currency: string,
  appPreferences: AppPreferences,
) {
  return formatCompactCurrencyValue(value, currency, appPreferences);
}

function fmtPercent(
  value: number | null,
  appPreferences: AppPreferences,
  signed = true,
) {
  return formatPercentValue(value, appPreferences, { signed });
}

function fmtCompactPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(0)}%`;
}

function fmtRangePercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function fmtRangeAmount(
  value: number | null,
  balance: number,
  currency: string,
  appPreferences: AppPreferences,
) {
  if (value === null || !Number.isFinite(value)) return "-";
  return fmtShortCurrency((balance * value) / 100, currency, appPreferences);
}

function toneFromNumber(value: number | null): Tone {
  if (value === null || value === 0) return "flat";
  return value > 0 ? "positive" : "negative";
}

function outcomeFromValue(value: number, trades = 1): Outcome {
  if (trades === 0) return "empty";
  if (value > 0) return "win";
  if (value < 0) return "loss";
  return "break-even";
}

function niceChartStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function periodTrades(
  trades: Trade[],
  start: string | null,
  end: string | null,
) {
  return trades.filter((trade) => {
    if (start && trade.date < start) return false;
    if (end && trade.date > end) return false;
    return true;
  });
}

function commissionFor(trade: Trade, commissionPerLot: number) {
  return (trade.entry.lotSize ?? 0) * commissionPerLot;
}

function grossPnl(trades: Trade[]) {
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
}

function netPnl(trades: Trade[], commissionPerLot: number) {
  return (
    grossPnl(trades) -
    trades.reduce(
      (sum, trade) => sum + commissionFor(trade, commissionPerLot),
      0,
    )
  );
}

function tradeNetValue(trade: Trade, commissionPerLot: number) {
  return (trade.pnl ?? 0) - commissionFor(trade, commissionPerLot);
}

function weekLabelFromDate(value: string, appPreferences: AppPreferences) {
  const date = parseDate(value);
  const start = startOfWeek(date, appPreferences);
  const end = endOfWeek(date, appPreferences);
  return formatDateRangeValue(dateKey(start), dateKey(end), appPreferences);
}

function rankedRows(rows: RankingRow[], direction: "loss" | "win") {
  return rows
    .filter((row) => (direction === "win" ? row.value > 0 : row.value < 0))
    .sort((a, b) =>
      direction === "win" ? b.value - a.value : a.value - b.value,
    )
    .slice(0, 10);
}

function buildTradeRanking(
  trades: Trade[],
  commissionPerLot: number,
  direction: "loss" | "win",
  appPreferences: AppPreferences,
) {
  const rows = trades.filter(isClosedTrade).map((trade) => ({
    id: trade.id,
    label: formatTradeName(trade, trades),
    meta: `${trade.pair} - ${formatDateTimeValue(trade.date, tradeTime(trade), appPreferences)} ${trade.direction}`,
    trades: 1,
    value: tradeNetValue(trade, commissionPerLot),
  }));

  return rankedRows(rows, direction);
}

function buildGroupedRanking(
  trades: Trade[],
  commissionPerLot: number,
  direction: "loss" | "win",
  groupFor: (trade: Trade) => { id: string; label: string; meta: string },
) {
  const groups = new Map<string, RankingRow>();

  for (const trade of trades.filter(isClosedTrade)) {
    const group = groupFor(trade);
    const current =
      groups.get(group.id) ??
      ({
        id: group.id,
        label: group.label,
        meta: group.meta,
        trades: 0,
        value: 0,
      } satisfies RankingRow);

    current.trades += 1;
    current.value += tradeNetValue(trade, commissionPerLot);
    groups.set(group.id, current);
  }

  return rankedRows(Array.from(groups.values()), direction);
}

function buildRankingStats(
  trades: Trade[],
  commissionPerLot: number,
  appPreferences: AppPreferences,
): RankingStats {
  return {
    losingDays: buildGroupedRanking(
      trades,
      commissionPerLot,
      "loss",
      (trade) => ({
        id: trade.date,
        label: formatDateValue(trade.date, appPreferences),
        meta: dayLabel(trade, appPreferences),
      }),
    ),
    losingMonths: buildGroupedRanking(
      trades,
      commissionPerLot,
      "loss",
      (trade) => {
        const date = parseDate(trade.date);
        return {
          id: dateKey(startOfMonth(date)),
          label: monthLabel(date),
          meta: "Month",
        };
      },
    ),
    losingTrades: buildTradeRanking(
      trades,
      commissionPerLot,
      "loss",
      appPreferences,
    ),
    losingWeeks: buildGroupedRanking(
      trades,
      commissionPerLot,
      "loss",
      (trade) => ({
        id: dateKey(startOfWeek(parseDate(trade.date), appPreferences)),
        label: weekLabelFromDate(trade.date, appPreferences),
        meta: "Week",
      }),
    ),
    winningDays: buildGroupedRanking(
      trades,
      commissionPerLot,
      "win",
      (trade) => ({
        id: trade.date,
        label: formatDateValue(trade.date, appPreferences),
        meta: dayLabel(trade, appPreferences),
      }),
    ),
    winningMonths: buildGroupedRanking(
      trades,
      commissionPerLot,
      "win",
      (trade) => {
        const date = parseDate(trade.date);
        return {
          id: dateKey(startOfMonth(date)),
          label: monthLabel(date),
          meta: "Month",
        };
      },
    ),
    winningTrades: buildTradeRanking(
      trades,
      commissionPerLot,
      "win",
      appPreferences,
    ),
    winningWeeks: buildGroupedRanking(
      trades,
      commissionPerLot,
      "win",
      (trade) => ({
        id: dateKey(startOfWeek(parseDate(trade.date), appPreferences)),
        label: weekLabelFromDate(trade.date, appPreferences),
        meta: "Week",
      }),
    ),
  };
}

function buildDailyBalanceHistory(
  trades: Trade[],
  startingBalance: number,
  commissionPerLot: number,
  start: Date,
  end: Date,
  now: Date,
  appPreferences: AppPreferences,
  includeTomorrow = false,
) {
  const closed = [...trades]
    .filter(isClosedTrade)
    .sort((a, b) => tradeSortValue(a).localeCompare(tradeSortValue(b)));

  const startKey = dateKey(start);
  const startPoint: HistoryPoint = {
    label: formatCompactDateValue(startKey, appPreferences),
    meta: "Starting balance",
    pnl: 0,
    value: startingBalance,
  };

  const dailyPnl = new Map<string, number>();
  for (const trade of closed) {
    dailyPnl.set(
      trade.date,
      (dailyPnl.get(trade.date) ?? 0) + tradeNetValue(trade, commissionPerLot),
    );
  }

  const todayKey = dateKey(now);
  const today = parseDate(todayKey);
  const tomorrow = addDays(today, 1);
  const endKey = dateKey(end);
  const lastValueDay =
    dateKey(today) < startKey ? start : dateKey(today) > endKey ? end : today;
  const dailyPoints: HistoryPoint[] = [];
  let balance = startingBalance;

  for (
    let cursor = start;
    dateKey(cursor) <= dateKey(lastValueDay);
    cursor = addDays(cursor, 1)
  ) {
    const key = dateKey(cursor);
    const pnl = dailyPnl.get(key) ?? 0;
    balance += pnl;
    dailyPoints.push({
      label: formatCompactDateValue(key, appPreferences),
      meta: key,
      pnl,
      value: balance,
    });
  }

  return [
    startPoint,
    ...dailyPoints,
    ...(includeTomorrow && dateKey(tomorrow) <= endKey
      ? [
          {
            label: formatCompactDateValue(dateKey(tomorrow), appPreferences),
            meta: dateKey(tomorrow),
            pnl: null,
            value: null,
          },
        ]
      : []),
  ];
}

function buildMonthlyBalanceCharts(
  trades: Trade[],
  startingBalance: number,
  commissionPerLot: number,
  now: Date,
  appPreferences: AppPreferences,
): MonthlyBalanceChart[] {
  const datedTrades = [...trades].sort((a, b) =>
    tradeSortValue(a).localeCompare(tradeSortValue(b)),
  );
  const firstMonth =
    datedTrades.length > 0
      ? startOfMonth(parseDate(datedTrades[0].date))
      : startOfMonth(now);
  const currentMonth = startOfMonth(now);
  const charts: MonthlyBalanceChart[] = [];

  for (
    let cursor = firstMonth;
    dateKey(cursor) <= dateKey(currentMonth);
    cursor = addMonths(cursor, 1)
  ) {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const beforeMonth = periodTrades(
      trades,
      null,
      dateKey(addDays(monthStart, -1)),
    );
    const monthTrades = periodTrades(
      trades,
      dateKey(monthStart),
      dateKey(monthEnd),
    );
    const monthStartBalance =
      startingBalance + netPnl(beforeMonth, commissionPerLot);
    const monthNet = netPnl(monthTrades, commissionPerLot);
    const isCurrentMonth = dateKey(monthStart) === dateKey(currentMonth);

    charts.push({
      growth:
        monthStartBalance === 0 || !Number.isFinite(monthStartBalance)
          ? null
          : (monthNet / monthStartBalance) * 100,
      id: dateKey(monthStart),
      label: monthLabel(monthStart),
      points: buildDailyBalanceHistory(
        monthTrades,
        monthStartBalance,
        commissionPerLot,
        monthStart,
        monthEnd,
        now,
        appPreferences,
        isCurrentMonth,
      ),
    });
  }

  return charts;
}

function buildTotalBalanceHistory(
  trades: Trade[],
  startingBalance: number,
  commissionPerLot: number,
  now: Date,
  appPreferences: AppPreferences,
) {
  const datedTrades = [...trades].sort((a, b) =>
    tradeSortValue(a).localeCompare(tradeSortValue(b)),
  );
  const start = datedTrades.length > 0 ? parseDate(datedTrades[0].date) : now;

  return buildDailyBalanceHistory(
    trades,
    startingBalance,
    commissionPerLot,
    start,
    addDays(now, 1),
    now,
    appPreferences,
    true,
  );
}

function buildWeeklyBalanceCards(
  trades: Trade[],
  startingBalance: number,
  commissionPerLot: number,
  currency: string,
  now: Date,
  appPreferences: AppPreferences,
): WeeklyBalanceCard[] {
  const datedTrades = [...trades].sort((a, b) =>
    tradeSortValue(a).localeCompare(tradeSortValue(b)),
  );
  const firstWeek =
    datedTrades.length > 0
      ? startOfWeek(parseDate(datedTrades[0].date), appPreferences)
      : startOfWeek(now, appPreferences);
  const currentWeek = startOfWeek(now, appPreferences);
  const cards: WeeklyBalanceCard[] = [];

  for (
    let cursor = firstWeek;
    dateKey(cursor) <= dateKey(currentWeek);
    cursor = addDays(cursor, 7)
  ) {
    const weekStart = startOfWeek(cursor, appPreferences);
    const weekEnd = endOfWeek(cursor, appPreferences);
    const beforeWeek = periodTrades(
      trades,
      null,
      dateKey(addDays(weekStart, -1)),
    );
    const weekTrades = periodTrades(
      trades,
      dateKey(weekStart),
      dateKey(weekEnd),
    );
    const weekStartBalance =
      startingBalance + netPnl(beforeWeek, commissionPerLot);
    const label = formatDateRangeValue(
      dateKey(weekStart),
      dateKey(weekEnd),
      appPreferences,
    );
    const isCurrentWeek = dateKey(weekStart) === dateKey(currentWeek);

    cards.push({
      id: dateKey(weekStart),
      label,
      points: buildDailyBalanceHistory(
        weekTrades,
        weekStartBalance,
        commissionPerLot,
        weekStart,
        weekEnd,
        now,
        appPreferences,
        isCurrentWeek,
      ),
      summary: buildSummary({
        commissionPerLot,
        currency,
        appPreferences,
        end: dateKey(weekEnd),
        id: "week",
        label: "Week",
        outcomes: [],
        selectedTrades: weekTrades,
        startingBalance: weekStartBalance,
        subtitle: label,
      }),
      weekNumber: weekNumber(weekStart),
    });
  }

  return cards;
}

function rateGroups(
  trades: Trade[],
  getLabel: (trade: Trade) => string,
): RateLeaders {
  const groups = new Map<string, RateRow>();

  for (const trade of trades.filter(isClosedTrade)) {
    const label = getLabel(trade);
    const row =
      groups.get(label) ??
      ({
        beRate: null,
        breakEvens: 0,
        label,
        losses: 0,
        lossRate: null,
        pnl: 0,
        trades: 0,
        winRate: null,
        wins: 0,
      } satisfies RateRow);

    row.trades += 1;
    row.pnl += trade.pnl ?? 0;
    if (trade.exit.result === "win") row.wins += 1;
    if (trade.exit.result === "loss") row.losses += 1;
    if (trade.exit.result === "break-even") row.breakEvens += 1;
    groups.set(label, row);
  }

  const rows = Array.from(groups.values()).map((row) => ({
    ...row,
    beRate: row.trades === 0 ? null : (row.breakEvens / row.trades) * 100,
    lossRate: row.trades === 0 ? null : (row.losses / row.trades) * 100,
    winRate: row.trades === 0 ? null : (row.wins / row.trades) * 100,
  }));
  const bestWin =
    [...rows].sort(
      (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.trades - a.trades,
    )[0] ?? null;
  const worstWin =
    [...rows].sort(
      (a, b) => (a.winRate ?? 101) - (b.winRate ?? 101) || b.trades - a.trades,
    )[0] ?? null;

  return {
    bestWin,
    rows: rows.sort((a, b) => b.pnl - a.pnl),
    worstWin,
  };
}

function emptyRateRow(label: string): RateRow {
  return {
    beRate: null,
    breakEvens: 0,
    label,
    losses: 0,
    lossRate: null,
    pnl: 0,
    trades: 0,
    winRate: null,
    wins: 0,
  };
}

function detailRateRows(
  rows: RateRow[],
  appPreferences: AppPreferences,
  scope?: RateDetailScope,
) {
  if (!scope) return rows;
  const rowMap = new Map(rows.map((row) => [row.label, row]));
  const labels =
    scope === "day"
      ? orderedWeekdayLabels(appPreferences)
      : scope === "direction"
        ? DIRECTION_LABELS
        : scope === "session"
          ? SESSION_LABELS
          : TIME_INTERVAL_LABELS;
  return labels.map((label) => rowMap.get(label) ?? emptyRateRow(label));
}

function rateRowsWithLabels(rows: RateRow[], labels: string[]) {
  const rowMap = new Map(rows.map((row) => [row.label, row]));
  const seen = new Set<string>();
  const fixedRows = labels.flatMap((label) => {
    const cleanLabel = label.trim();
    if (!cleanLabel || seen.has(cleanLabel)) return [];
    seen.add(cleanLabel);
    return [rowMap.get(cleanLabel) ?? emptyRateRow(cleanLabel)];
  });
  const extraRows = rows.filter((row) => !seen.has(row.label));
  return [...fixedRows, ...extraRows];
}

function buildTradeOutcomes(
  trades: Trade[],
  commissionPerLot: number,
  appPreferences: AppPreferences,
): OutcomePoint[] {
  return [...trades]
    .filter(isClosedTrade)
    .sort((a, b) => tradeSortValue(b).localeCompare(tradeSortValue(a)))
    .slice(0, 10)
    .reverse()
    .map((trade) => {
      const value = (trade.pnl ?? 0) - commissionFor(trade, commissionPerLot);
      const result = trade.exit.result;
      return {
        label: formatTradeName(trade, trades),
        meta: `${trade.pair} - ${formatCompactDateValue(trade.date, appPreferences)} ${trade.direction}`,
        outcome:
          result === "win" || result === "loss" || result === "break-even"
            ? result
            : outcomeFromValue(value),
        value,
      };
    });
}

function buildMonthOutcomes(
  trades: Trade[],
  now: Date,
  commissionPerLot: number,
): OutcomePoint[] {
  return Array.from({ length: 10 }, (_, index) =>
    addMonths(now, index - 9),
  ).map((month) => {
    const monthTrades = periodTrades(
      trades,
      dateKey(startOfMonth(month)),
      dateKey(endOfMonth(month)),
    );
    const value = netPnl(monthTrades, commissionPerLot);
    return {
      label: monthLabel(month, "short"),
      meta: `${monthTrades.length} trades`,
      outcome: outcomeFromValue(value, monthTrades.length),
      value,
    };
  });
}

function buildWeekOutcomes(
  trades: Trade[],
  now: Date,
  commissionPerLot: number,
  appPreferences: AppPreferences,
): OutcomePoint[] {
  const currentWeek = startOfWeek(now, appPreferences);
  return Array.from({ length: 10 }, (_, index) =>
    addDays(currentWeek, (index - 9) * 7),
  ).map((week) => {
    const weekStart = startOfWeek(week, appPreferences);
    const weekEnd = endOfWeek(week, appPreferences);
    const weekTrades = periodTrades(
      trades,
      dateKey(weekStart),
      dateKey(weekEnd),
    );
    const value = netPnl(weekTrades, commissionPerLot);
    return {
      label: formatCompactDateValue(dateKey(weekStart), appPreferences),
      meta: `${weekTrades.length} trades`,
      outcome: outcomeFromValue(value, weekTrades.length),
      value,
    };
  });
}

function buildSummary({
  commissionPerLot,
  currency,
  appPreferences,
  end,
  id,
  label,
  outcomes,
  selectedTrades,
  startingBalance,
  subtitle,
}: {
  commissionPerLot: number;
  currency: string;
  appPreferences: AppPreferences;
  end: string | null;
  id: SummaryScope;
  label: string;
  outcomes: OutcomePoint[];
  selectedTrades: Trade[];
  startingBalance: number;
  subtitle: string;
}): SummaryData {
  const closed = selectedTrades.filter(isClosedTrade);
  const gross = grossPnl(closed);
  const commission = closed.reduce(
    (sum, trade) => sum + commissionFor(trade, commissionPerLot),
    0,
  );
  const net = gross - commission;
  const balance = startingBalance + net;

  return {
    balance,
    breakEvens: closed.filter((trade) => trade.exit.result === "break-even")
      .length,
    closed: closed.length,
    commission,
    endLabel: subtitle,
    grossPnl: gross,
    growth:
      startingBalance === 0 || !Number.isFinite(startingBalance)
        ? null
        : (net / startingBalance) * 100,
    id,
    labels: {
      history:
        id === "total"
          ? "Last 10 trades"
          : id === "month"
            ? "Last 10 months"
            : "Last 10 weeks",
      title: label,
    },
    losses: closed.filter((trade) => trade.exit.result === "loss").length,
    netPnl: net,
    open: selectedTrades.filter((trade) => !isClosedTrade(trade)).length,
    outcomes,
    rateGroups: {
      day: rateGroups(closed, (trade) => dayLabel(trade, appPreferences)),
      direction: rateGroups(closed, directionLabel),
      pair: rateGroups(closed, pairLabel),
      session: rateGroups(closed, (trade) =>
        sessionLabel(trade, appPreferences),
      ),
      strategy: rateGroups(closed, strategyLabel),
      time: rateGroups(closed, (trade) =>
        timeOfDayLabel(trade, appPreferences),
      ),
    },
    startingBalance,
    trades: selectedTrades,
    wins: closed.filter((trade) => trade.exit.result === "win").length,
  };
}

function LeaderCell({
  mode,
  row,
  tone = mode === "loss" ? "negative" : "positive",
}: {
  mode: "loss" | "win";
  row: RateRow | null;
  tone?: "negative" | "positive";
}) {
  if (!row) {
    return <strong>-</strong>;
  }
  const rate = mode === "win" ? row.winRate : row.lossRate;

  return (
    <strong className={tone === "negative" ? "negative" : ""}>
      <span>{row.label}</span>
      <em>{fmtCompactPercent(rate)}</em>
    </strong>
  );
}

function RiskCell({
  appPreferences,
  currency,
  label,
  summary,
  value,
}: {
  appPreferences: AppPreferences;
  currency: string;
  label: string;
  summary: SummaryData;
  value: number | null;
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <b>
        <small>{label}</small>
        <span>-</span>
      </b>
    );
  }

  return (
    <b>
      <small>{label}</small>
      <span>{fmtCompactPercent(value)}</span>
      <em>
        {fmtRangeAmount(
          value,
          summary.startingBalance,
          currency,
          appPreferences,
        )}
      </em>
    </b>
  );
}

function HoverRing({
  centerLabel,
  centerValue,
  segments,
}: {
  centerLabel: string;
  centerValue: string;
  segments: RingSegment[];
}) {
  const [activeSegment, setActiveSegment] = useState<RingSegment | null>(null);
  const visibleSegments = segments.filter(
    (segment) => Number.isFinite(segment.weight) && segment.weight > 0,
  );
  const totalWeight = visibleSegments.reduce(
    (sum, segment) => sum + segment.weight,
    0,
  );
  let offset = 0;
  const center = activeSegment
    ? { label: activeSegment.label, value: activeSegment.valueText }
    : { label: centerLabel, value: centerValue };

  function updateActiveSegment(
    clientX: number,
    clientY: number,
    target: HTMLElement,
  ) {
    if (visibleSegments.length === 0 || totalWeight === 0) {
      setActiveSegment(null);
      return;
    }

    const box = target.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width) * 100;
    const y = ((clientY - box.top) / box.height) * 100;
    const dx = x - 50;
    const dy = y - 50;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 28 || distance > 52) {
      setActiveSegment(null);
      return;
    }

    const angle = (Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360;
    let currentAngle = 0;
    const hoveredSegment =
      visibleSegments.find((segment) => {
        currentAngle += (segment.weight / totalWeight) * 360;
        return angle <= currentAngle;
      }) ?? visibleSegments[visibleSegments.length - 1];

    setActiveSegment(hoveredSegment);
  }

  return (
    <div
      className="dash-hover-ring-wrap"
      onMouseLeave={() => setActiveSegment(null)}
      onMouseMove={(event) =>
        updateActiveSegment(event.clientX, event.clientY, event.currentTarget)
      }
      onMouseOut={() => setActiveSegment(null)}
      onPointerLeave={() => setActiveSegment(null)}
      onPointerMove={(event) =>
        updateActiveSegment(event.clientX, event.clientY, event.currentTarget)
      }
      onPointerOut={() => setActiveSegment(null)}
    >
      <svg
        aria-label={`${centerLabel} ring`}
        className="dash-hover-ring"
        role="img"
        viewBox="0 0 100 100"
      >
        <circle className="dash-ring-track" cx="50" cy="50" r="42" />
        {visibleSegments.length === 0 ? (
          <circle className="dash-ring-empty" cx="50" cy="50" r="42" />
        ) : (
          visibleSegments.map((segment) => {
            const length = (segment.weight / totalWeight) * RING_CIRCUMFERENCE;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                className="dash-ring-segment"
                cx="50"
                cy="50"
                key={segment.label}
                onBlur={() => setActiveSegment(null)}
                onFocus={() => setActiveSegment(segment)}
                onMouseEnter={() => setActiveSegment(segment)}
                onMouseLeave={() => setActiveSegment(null)}
                onPointerEnter={() => setActiveSegment(segment)}
                onPointerLeave={() => setActiveSegment(null)}
                r="42"
                stroke={segment.color}
                strokeDasharray={`${Math.max(length - 1.5, 0)} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                tabIndex={0}
              >
                <title>
                  {segment.label}: {segment.valueText}
                </title>
              </circle>
            );
          })
        )}
      </svg>
      <div className="dash-ring-center">
        <strong>{center.value}</strong>
        <span>{center.label}</span>
      </div>
    </div>
  );
}

function TradeRing({ summary }: { summary: SummaryData }) {
  return (
    <HoverRing
      centerLabel="trades"
      centerValue={summary.closed.toString()}
      segments={[
        {
          color: "#6cd49a",
          label: "wins",
          valueText: summary.wins.toString(),
          weight: summary.wins,
        },
        {
          color: "#f08688",
          label: "losses",
          valueText: summary.losses.toString(),
          weight: summary.losses,
        },
        {
          color: "#f5b86c",
          label: "break even",
          valueText: summary.breakEvens.toString(),
          weight: summary.breakEvens,
        },
      ]}
    />
  );
}

function BalanceStack({
  appPreferences,
  currency,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  summary: SummaryData;
}) {
  return (
    <div className="dash-balance-stack">
      <div>
        <span>Starting</span>
        <strong>
          {fmtCurrency(summary.startingBalance, currency, appPreferences)}
        </strong>
      </div>
      <div>
        <span>Current</span>
        <strong className={`primary ${toneFromNumber(summary.netPnl)}`}>
          {fmtCurrency(summary.balance, currency, appPreferences)}
        </strong>
      </div>
      <div>
        <span>Growth</span>
        <strong className={toneFromNumber(summary.growth)}>
          {fmtPercent(summary.growth, appPreferences)}
        </strong>
      </div>
    </div>
  );
}

function PnlRing({
  appPreferences,
  currency,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  summary: SummaryData;
}) {
  return (
    <HoverRing
      centerLabel="net"
      centerValue={fmtShortCurrency(summary.netPnl, currency, appPreferences)}
      segments={[
        {
          color: summary.grossPnl < 0 ? "#f08688" : "#6cd49a",
          label: "gross",
          valueText: fmtShortCurrency(
            summary.grossPnl,
            currency,
            appPreferences,
          ),
          weight: Math.abs(summary.grossPnl),
        },
        {
          color: "#f5b86c",
          label: "commission",
          valueText: fmtShortCurrency(
            summary.commission,
            currency,
            appPreferences,
          ),
          weight: Math.abs(summary.commission),
        },
      ]}
    />
  );
}

function OutcomeBoxes({
  appPreferences,
  currency,
  points,
  title,
}: {
  appPreferences: AppPreferences;
  currency: string;
  points: OutcomePoint[];
  title: string;
}) {
  const visiblePoints = Array.from({ length: 10 }, (_, index) => {
    return (
      points[index] ?? {
        label: "-",
        meta: "No data",
        outcome: "empty" as const,
        value: 0,
      }
    );
  });

  return (
    <div className="dash-outcomes">
      <div className="dash-outcomes-head">
        <span>{title}</span>
      </div>
      <div className="dash-outcome-strip">
        {visiblePoints.map((point, index) => (
          <span
            aria-label={`${point.label} ${point.meta} ${point.outcome}`}
            className={`dash-outcome-box ${point.outcome}`}
            key={`${point.label}-${point.meta}-${index}`}
            title={`${point.label} ${point.meta}: ${fmtCurrency(
              point.value,
              currency,
              appPreferences,
              true,
            )}`}
          />
        ))}
      </div>
    </div>
  );
}

function RateLeadersGrid({ summary }: { summary: SummaryData }) {
  return (
    <div className="dash-rate-grid">
      <section>
        <span>Best win rate</span>
        <div>
          <LeaderCell mode="win" row={summary.rateGroups.day.bestWin} />
          <LeaderCell mode="win" row={summary.rateGroups.session.bestWin} />
          <LeaderCell mode="win" row={summary.rateGroups.time.bestWin} />
        </div>
      </section>
      <section>
        <span>Worst win rate</span>
        <div>
          <LeaderCell
            mode="win"
            row={summary.rateGroups.day.worstWin}
            tone="negative"
          />
          <LeaderCell
            mode="win"
            row={summary.rateGroups.session.worstWin}
            tone="negative"
          />
          <LeaderCell
            mode="win"
            row={summary.rateGroups.time.worstWin}
            tone="negative"
          />
        </div>
      </section>
    </div>
  );
}

function RiskGoalGrid({
  appPreferences,
  currency,
  riskPlan,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  riskPlan: RiskManagementPlan | null;
  summary: SummaryData;
}) {
  const riskMin = riskPlan?.riskPerWeekMinPercent ?? null;
  const riskMax = riskPlan?.riskPerWeekMaxPercent ?? null;
  const riskMid =
    riskMin === null || riskMax === null ? null : (riskMin + riskMax) / 2;

  return (
    <div className="dash-risk-goal-grid">
      <strong>Risk</strong>
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Min"
        summary={summary}
        value={riskMin}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Mid"
        summary={summary}
        value={riskMid}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Max"
        summary={summary}
        value={riskMax}
      />
      <strong>Goal</strong>
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Min"
        summary={summary}
        value={riskPlan?.weeklyGoalMinPercent ?? null}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Mid"
        summary={summary}
        value={riskPlan?.weeklyGoalMidPercent ?? null}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Max"
        summary={summary}
        value={riskPlan?.weeklyGoalMaxPercent ?? null}
      />
    </div>
  );
}

function SummaryBand({
  appPreferences,
  currency,
  riskPlan,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  riskPlan: RiskManagementPlan | null;
  summary: SummaryData;
}) {
  return (
    <article className={`dash-summary-band dash-summary-${summary.id}`}>
      <header>
        <div>
          <span>{summary.labels.title}</span>
          <strong>{summary.endLabel}</strong>
        </div>
        <small>{summary.open} open</small>
      </header>
      <div className="dash-summary-core">
        <BalanceStack
          appPreferences={appPreferences}
          currency={currency}
          summary={summary}
        />
        {summary.id === "week" ? (
          <RiskGoalGrid
            appPreferences={appPreferences}
            currency={currency}
            riskPlan={riskPlan}
            summary={summary}
          />
        ) : (
          <RateLeadersGrid summary={summary} />
        )}
      </div>
      <div className="dash-ring-row">
        <div className="dash-ring-tile">
          <PnlRing
            appPreferences={appPreferences}
            currency={currency}
            summary={summary}
          />
        </div>
        <div className="dash-ring-tile">
          <TradeRing summary={summary} />
        </div>
      </div>
      <OutcomeBoxes
        appPreferences={appPreferences}
        currency={currency}
        points={summary.outcomes}
        title={summary.labels.history}
      />
    </article>
  );
}

function ChartPanel({
  currency,
  appPreferences,
  growth,
  icon,
  onOpen,
  points,
  scope,
  title,
}: {
  currency: string;
  appPreferences: AppPreferences;
  growth: number | null;
  icon: React.ReactNode;
  onOpen?: () => void;
  points: HistoryPoint[];
  scope: SummaryScope;
  title: string;
}) {
  const values = points
    .map((point) => point.value)
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );
  const rawMin = values.length === 0 ? 0 : Math.min(...values);
  const rawMax = values.length === 0 ? 0 : Math.max(...values);
  const startingBalance =
    points.find(
      (point): point is HistoryPoint & { value: number } =>
        point.value !== null && Number.isFinite(point.value),
    )?.value ?? 0;
  const totalScale =
    scope === "total" && startingBalance > 0
      ? {
          max:
            startingBalance *
            Math.max(
              3,
              Math.ceil(Math.max(rawMax, startingBalance) / startingBalance),
            ),
          min: Math.min(0, rawMin),
        }
      : null;
  const padding = Math.max((rawMax - rawMin) * 0.14, 1);
  const min = totalScale?.min ?? rawMin - padding;
  const max = totalScale?.max ?? rawMax + padding;
  const range = Math.max(max - min, 1);
  const chartWidth = 100;
  const chartHeight = 100;
  const padLeft = 14;
  const padRight = 4;
  const padTop = 4;
  const padBottom = 13;
  const bottomY = chartHeight - padBottom;
  const rightX = chartWidth - padRight;
  const pointRightX = scope === "week" ? rightX - 8 : rightX;
  const plotWidth = pointRightX - padLeft;
  const plotHeight = chartHeight - padTop - padBottom;
  const yForValue = (value: number) =>
    padTop + ((max - value) / range) * plotHeight;
  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? (padLeft + pointRightX) / 2
        : padLeft + (index / (points.length - 1)) * plotWidth;
    const y = point.value === null ? null : yForValue(point.value);
    return { point, x, y };
  });
  const plottedCoordinates = coordinates.filter(
    (
      item,
    ): item is {
      point: HistoryPoint & { value: number };
      x: number;
      y: number;
    } => item.y !== null && item.point.value !== null,
  );
  const path = plottedCoordinates
    .map((item, index) => `${index === 0 ? "M" : "L"} ${item.x} ${item.y}`)
    .join(" ");
  const areaPath =
    plottedCoordinates.length === 0
      ? ""
      : `${path} L ${
          plottedCoordinates[plottedCoordinates.length - 1].x
        } ${bottomY} L ${plottedCoordinates[0].x} ${bottomY} Z`;
  const currentBalance =
    plottedCoordinates[plottedCoordinates.length - 1]?.point.value ??
    startingBalance;
  const startLineY = yForValue(startingBalance);
  const startTone =
    currentBalance === startingBalance
      ? "flat"
      : currentBalance > startingBalance
        ? "positive"
        : "negative";
  const dayCount = Math.max(
    points.filter(
      (point) => point.meta !== "Starting balance" && point.value !== null,
    ).length,
    0,
  );
  const gridStep =
    totalScale && startingBalance > 0
      ? startingBalance / 2
      : niceChartStep(range / 4);
  const gridStart = Math.ceil(min / gridStep) * gridStep;
  const gridLines =
    gridStep <= 0
      ? []
      : Array.from(
          {
            length: Math.floor((max - gridStart) / gridStep + 0.0001) + 1,
          },
          (_, index) => gridStart + index * gridStep,
        ).filter((value) => value >= min && value <= max);
  const dayTicks = coordinates.filter(
    (item) => item.point.meta !== "Starting balance",
  );
  const pointMetaLabel = (meta: string) =>
    meta === "Starting balance" ? meta : formatDateValue(meta, appPreferences);

  return (
    <section
      aria-label={onOpen ? `Open ${title} detail` : undefined}
      className={`panel dash-graph-panel ${onOpen ? "dash-graph-panel-openable" : ""}`}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === "Enter") onOpen();
      }}
    >
      <header className="panel-header">
        <h3>
          {icon}
          {title}
        </h3>
        <span className="panel-tag">{dayCount} days</span>
      </header>
      <div className="dash-line-chart">
        {points.length === 0 ? (
          <p className="empty-state">No data yet.</p>
        ) : (
          <>
            <svg
              aria-label={`${title} line graph`}
              className="dash-line-svg"
              preserveAspectRatio="none"
              role="img"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              {gridLines.map((value) => {
                const y = yForValue(value);
                return (
                  <g className="dash-grid-line" key={value}>
                    <line x1={padLeft} x2={rightX} y1={y} y2={y} />
                    <text x={padLeft - 2.5} y={y + 1.1}>
                      {fmtAxisCurrency(value, currency, appPreferences)}
                    </text>
                  </g>
                );
              })}
              <line
                className="dash-axis dash-axis-main"
                x1={padLeft}
                x2={padLeft}
                y1={padTop}
                y2={bottomY}
              />
              <line
                className="dash-axis dash-axis-main"
                x1={padLeft}
                x2={rightX}
                y1={bottomY}
                y2={bottomY}
              />
              <path
                className="dash-axis-arrow"
                d={`M ${padLeft - 1.5} ${padTop + 3} L ${padLeft} ${padTop} L ${
                  padLeft + 1.5
                } ${padTop + 3}`}
              />
              <path
                className="dash-axis-arrow"
                d={`M ${rightX - 3} ${bottomY - 1.5} L ${rightX} ${bottomY} L ${
                  rightX - 3
                } ${bottomY + 1.5}`}
              />
              <path className="dash-line-area" d={areaPath} />
              <line
                className={`dash-start-line ${startTone}`}
                x1={padLeft}
                x2={rightX}
                y1={startLineY}
                y2={startLineY}
              >
                <title>
                  Starting balance:{" "}
                  {fmtCurrency(startingBalance, currency, appPreferences)}
                </title>
              </line>
              <path className="dash-line-path" d={path} />
              {plottedCoordinates.map((item) => (
                <circle
                  className="dash-line-dot"
                  cx={item.x}
                  cy={item.y}
                  key={item.point.meta}
                  r="1.35"
                >
                  <title>
                    {pointMetaLabel(item.point.meta)}: P&L{" "}
                    {fmtCurrency(
                      item.point.pnl ?? 0,
                      currency,
                      appPreferences,
                      true,
                    )}
                    . Balance{" "}
                    {fmtCurrency(item.point.value, currency, appPreferences)}.
                  </title>
                </circle>
              ))}
              {dayTicks.map((item) => (
                <g className="dash-x-tick" key={item.point.meta}>
                  <line
                    x1={item.x}
                    x2={item.x}
                    y1={bottomY}
                    y2={bottomY + 1.9}
                  />
                  <text x={item.x} y={bottomY + 5}>
                    {scope === "week"
                      ? weekTickLabel(item.point.meta)
                      : item.point.label}
                  </text>
                </g>
              ))}
            </svg>
            <div className="dash-line-labels">
              <strong>Growth {fmtPercent(growth, appPreferences)}</strong>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function RateStatsCard({
  leaders,
  onOpen,
  title,
  variant = "bestWorst",
}: {
  leaders: RateLeaders;
  onOpen: () => void;
  title: string;
  variant?: "bestWorst" | "buySell" | "simple";
}) {
  const top = leaders.rows[0] ?? null;
  const long = leaders.rows.find((row) => row.label === "Long") ?? null;
  const short = leaders.rows.find((row) => row.label === "Short") ?? null;

  if (variant !== "simple") {
    const left = variant === "buySell" ? long : leaders.bestWin;
    const right = variant === "buySell" ? short : leaders.worstWin;

    return (
      <button
        className="dash-stat-card is-split"
        type="button"
        onClick={onOpen}
      >
        <span>{title}</span>
        <div className="dash-stat-split">
          <RateStatMini
            caption={variant === "buySell" ? "Long" : "Best win rate"}
            row={left}
          />
          <RateStatMini
            caption={variant === "buySell" ? "Short" : "Worst win rate"}
            row={right}
          />
        </div>
      </button>
    );
  }

  return (
    <button className="dash-stat-card" type="button" onClick={onOpen}>
      <span>{title}</span>
      <strong>{top?.label ?? "-"}</strong>
      <small>
        {top
          ? `${fmtCompactPercent(top.winRate)} win / ${fmtCompactPercent(
              top.lossRate,
            )} loss`
          : "No data"}
      </small>
    </button>
  );
}

function RateStatMini({
  caption,
  row,
}: {
  caption: string;
  row: RateRow | null;
}) {
  return (
    <div className="dash-stat-mini">
      <span>{caption}</span>
      <strong>{row?.label ?? "-"}</strong>
      <small>{row ? `${fmtCompactPercent(row.winRate)} win` : "No data"}</small>
    </div>
  );
}

function RankingStatsCard({
  appPreferences,
  currency,
  onOpen,
  rows,
  title,
}: {
  appPreferences: AppPreferences;
  currency: string;
  onOpen: () => void;
  rows: RankingRow[];
  title: string;
}) {
  const top = rows[0] ?? null;
  return (
    <button className="dash-stat-card" type="button" onClick={onOpen}>
      <span>{title}</span>
      <strong>{top?.label ?? "-"}</strong>
      <small>
        {top
          ? `${fmtCurrency(
              top.value,
              currency,
              appPreferences,
              true,
            )} · ${top.meta}`
          : "No data"}
      </small>
    </button>
  );
}

function StatsDetailModal({
  currency,
  appPreferences,
  detail,
  onClose,
}: {
  currency: string;
  appPreferences: AppPreferences;
  detail: DetailState;
  onClose: () => void;
}) {
  const [rateView, setRateView] = useState<"chart" | "table">("table");
  useEffect(() => {
    setRateView("table");
  }, [detail?.title]);

  if (!detail) return null;

  const rateRows =
    detail.type === "rate"
      ? detailRateRows(detail.rows, appPreferences, detail.scope)
      : [];
  const rateNameLabel =
    detail.type === "rate" && detail.scope === "day"
      ? "Day"
      : detail.type === "rate" && detail.scope === "direction"
        ? "Direction"
        : detail.type === "rate" && detail.scope === "session"
          ? "Session"
          : detail.type === "rate" && detail.scope === "time"
            ? "Time"
            : "Name";
  const modalClassName =
    detail.type === "rate"
      ? `dash-detail-modal is-rate-${rateView}`
      : "dash-detail-modal is-ranking";

  return (
    <ModalShell
      ariaLabel={detail.title}
      modalClassName={modalClassName}
      onClose={onClose}
      subtitle={
        detail.type === "rate"
          ? "Detailed win, loss, and P&L view."
          : "Top 10 ranked by net P&L."
      }
      title={detail.title}
    >
      {detail.type === "rate" ? (
        <div className="dash-rate-detail">
          <div
            className="dash-detail-tabs tab-bar"
            role="tablist"
            aria-label={`${detail.title} view`}
          >
            <button
              className={`tab ${rateView === "table" ? "active" : ""}`}
              role="tab"
              aria-selected={rateView === "table"}
              type="button"
              onClick={() => setRateView("table")}
            >
              Table
            </button>
            <button
              className={`tab ${rateView === "chart" ? "active" : ""}`}
              role="tab"
              aria-selected={rateView === "chart"}
              type="button"
              onClick={() => setRateView("chart")}
            >
              Chart
            </button>
          </div>
          {rateView === "table" ? (
            <div
              className={`dash-detail-table dash-rate-detail-table ${
                detail.scope === "day" ? "is-day" : ""
              }`}
            >
              <div>
                <span>{rateNameLabel}</span>
                <span>Trades</span>
                <span>Wins</span>
                <span>Losses</span>
                <span>Breakeven</span>
                <span>Win rate</span>
                <span>Loss rate</span>
                <span>BE rate</span>
                <span>Net P&L</span>
              </div>
              {rateRows.map((row) => (
                <div key={row.label}>
                  <strong>{row.label}</strong>
                  <span>{row.trades}</span>
                  <span className="positive">{row.wins}</span>
                  <span className="negative">{row.losses}</span>
                  <span>{row.breakEvens}</span>
                  <span className="positive">
                    {fmtCompactPercent(row.winRate)}
                  </span>
                  <span className="negative">
                    {fmtCompactPercent(row.lossRate)}
                  </span>
                  <span>{fmtCompactPercent(row.beRate)}</span>
                  <span className={toneFromNumber(row.pnl)}>
                    {fmtCurrency(row.pnl, currency, appPreferences, true)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <RateBarChart rows={rateRows} />
          )}
        </div>
      ) : (
        <div className="dash-detail-table dash-ranking-table">
          <div>
            <span>Name</span>
            <span>Detail</span>
            <span>Trades</span>
            <span>P&L</span>
          </div>
          {detail.rows.map((row) => (
            <div key={row.id}>
              <strong>{row.label}</strong>
              <span>{row.meta}</span>
              <span>{row.trades}</span>
              <span className={toneFromNumber(row.value)}>
                {fmtCurrency(row.value, currency, appPreferences, true)}
              </span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function RateBarChart({ rows }: { rows: RateRow[] }) {
  const maxCount = Math.max(
    1,
    ...rows.flatMap((row) => [row.wins, row.losses, row.breakEvens]),
  );
  const midCount = Math.ceil(maxCount / 2);
  const scaleTicks = maxCount === 1 ? [0, 1] : [0, midCount, maxCount];

  return (
    <div
      className="dash-rate-bar-chart"
      role="img"
      aria-label="Sideways trade result bar chart"
    >
      <div className="dash-rate-chart-scale" aria-hidden="true">
        <span />
        <div>
          {scaleTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <span>Trades</span>
      </div>
      {rows.map((row) => (
        <div className="dash-rate-bar-row" key={row.label}>
          <strong>{row.label}</strong>
          <div className="dash-rate-bars">
            <RateBar
              label="Win"
              tone="positive"
              value={row.wins}
              max={maxCount}
            />
            <RateBar
              label="Loss"
              tone="negative"
              value={row.losses}
              max={maxCount}
            />
            <RateBar
              label="BE"
              tone="warning"
              value={row.breakEvens}
              max={maxCount}
            />
          </div>
          <span>{row.trades}</span>
        </div>
      ))}
    </div>
  );
}

function RateBar({
  label,
  max,
  tone,
  value,
}: {
  label: string;
  max: number;
  tone: Tone;
  value: number;
}) {
  const width = max <= 0 ? 0 : (value / max) * 100;
  const detail = `${label}: ${value}`;

  return (
    <div className="dash-rate-bar-line" aria-label={detail} title={detail}>
      <div className="dash-rate-bar-track">
        <i className={tone} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ChartHistoryDetailModal({
  charts,
  currency,
  currentYear,
  appPreferences,
  onClose,
}: {
  charts: MonthlyBalanceChart[];
  currency: string;
  currentYear: string;
  appPreferences: AppPreferences;
  onClose: () => void;
}) {
  const years = useMemo(
    () => Array.from(new Set(charts.map((chart) => chart.id.slice(0, 4)))),
    [charts],
  );
  const [activeYear, setActiveYear] = useState(
    years.includes(currentYear)
      ? currentYear
      : (years[years.length - 1] ?? currentYear),
  );
  const visibleCharts = charts.filter((chart) =>
    chart.id.startsWith(activeYear),
  );

  return (
    <ModalShell
      ariaLabel="Monthly balance chart history"
      bodyClassName="dash-chart-detail-body"
      modalClassName="dash-chart-detail-modal"
      onClose={onClose}
      title="Monthly balance charts"
    >
      <div
        className="dash-chart-year-tabs tab-bar"
        role="tablist"
        aria-label="Balance chart year"
      >
        {years.map((year) => (
          <button
            className={`tab ${activeYear === year ? "active" : ""}`}
            key={year}
            role="tab"
            aria-selected={activeYear === year}
            type="button"
            onClick={() => setActiveYear(year)}
          >
            {year}
          </button>
        ))}
      </div>
      {visibleCharts.map((chart) => (
        <ChartPanel
          currency={currency}
          appPreferences={appPreferences}
          growth={chart.growth}
          icon={<LineChart size={14} aria-hidden="true" />}
          key={chart.id}
          points={chart.points}
          scope="month"
          title={chart.label}
        />
      ))}
    </ModalShell>
  );
}

function WeekHistoryDetailModal({
  appPreferences,
  cards,
  currency,
  currentYear,
  onClose,
  onOpenGraph,
}: {
  appPreferences: AppPreferences;
  cards: WeeklyBalanceCard[];
  currency: string;
  currentYear: string;
  onClose: () => void;
  onOpenGraph: (card: WeeklyBalanceCard) => void;
}) {
  const years = useMemo(
    () => Array.from(new Set(cards.map((card) => card.id.slice(0, 4)))),
    [cards],
  );
  const [activeYear, setActiveYear] = useState(
    years.includes(currentYear)
      ? currentYear
      : (years[years.length - 1] ?? currentYear),
  );
  const visibleCards = cards
    .filter((card) => card.id.startsWith(activeYear))
    .sort((a, b) => (a.id < b.id ? 1 : -1));

  return (
    <ModalShell
      ariaLabel="Weekly balance history"
      bodyClassName="dash-week-detail-body"
      modalClassName="dash-chart-detail-modal"
      onClose={onClose}
      title="Weekly balance history"
    >
      <div
        className="dash-chart-year-tabs tab-bar"
        role="tablist"
        aria-label="Weekly balance year"
      >
        {years.map((year) => (
          <button
            className={`tab ${activeYear === year ? "active" : ""}`}
            key={year}
            role="tab"
            aria-selected={activeYear === year}
            type="button"
            onClick={() => setActiveYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      <div className="trade-week-list dash-week-history-list">
        {visibleCards.map((card) => {
          const { summary } = card;
          return (
            <section className="trade-week-group" key={card.id}>
              <button
                className="trade-week-header dash-week-history-row"
                type="button"
                onClick={() => onOpenGraph(card)}
              >
                <span className="trade-week-title">
                  <ChevronRight size={16} aria-hidden="true" />
                  <span>Week {card.weekNumber}</span>
                  <span className="dash-week-range">{card.label}</span>
                </span>
                <span className="trade-week-meta dash-week-history-meta">
                  <span>{summary.closed} closed</span>
                  <span>
                    {summary.wins}W / {summary.losses}L / {summary.breakEvens}BE
                  </span>
                  <span>
                    Growth {fmtPercent(summary.growth, appPreferences)}
                  </span>
                  <strong className={toneFromNumber(summary.netPnl)}>
                    {fmtCurrency(
                      summary.netPnl,
                      currency,
                      appPreferences,
                      true,
                    )}
                  </strong>
                </span>
              </button>
            </section>
          );
        })}
      </div>
    </ModalShell>
  );
}

function WeekChartDetailModal({
  card,
  currency,
  appPreferences,
  onClose,
}: {
  card: WeeklyBalanceCard | null;
  currency: string;
  appPreferences: AppPreferences;
  onClose: () => void;
}) {
  if (!card) return null;

  return (
    <ModalShell
      ariaLabel={`Week ${card.weekNumber} ${card.label} balance graph`}
      bodyClassName="dash-week-chart-body"
      modalClassName="dash-week-chart-modal"
      onClose={onClose}
      title={`Week ${card.weekNumber} · ${card.label}`}
    >
      <ChartPanel
        currency={currency}
        appPreferences={appPreferences}
        growth={card.summary.growth}
        icon={<LineChart size={14} aria-hidden="true" />}
        points={card.points}
        scope="week"
        title="Week balance"
      />
    </ModalShell>
  );
}

export function DashboardModule({
  appPreferences,
  selectedAccount,
  selectedAccountId,
}: ModuleContext) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [riskPlan, setRiskPlan] = useState<RiskManagementPlan | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("total");
  const [detail, setDetail] = useState<DetailState>(null);
  const [chartDetailKind, setChartDetailKind] = useState<
    "month" | "week" | null
  >(null);
  const [weekGraphDetail, setWeekGraphDetail] =
    useState<WeeklyBalanceCard | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const [tradeRows, setup] = await Promise.all([
        listTrades(selectedAccountId),
        listAccountSetup(),
      ]);

      if (cancelled) return;

      setTrades(tradeRows);
      setStrategies(setup.strategies);
      setEducators(setup.educators);
      setRiskPlan(
        setup.riskPlans.find(
          (plan) =>
            selectedAccount?.riskPlanId &&
            plan.id === selectedAccount.riskPlanId,
        ) ?? null,
      );
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedAccount, selectedAccountId]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let midnightTimer: number | null = null;

    function refreshNow() {
      setNow(new Date());
    }

    function scheduleMidnightRefresh() {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      midnightTimer = window.setTimeout(
        () => {
          refreshNow();
          scheduleMidnightRefresh();
        },
        Math.max(nextMidnight.getTime() - current.getTime() + 1000, 1000),
      );
    }

    scheduleMidnightRefresh();
    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", refreshNow);

    return () => {
      if (midnightTimer) window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, []);

  const currency = selectedAccount?.currency ?? "USD";
  const commissionPerLot = selectedAccount?.commission ?? 0;
  const accountStart = selectedAccount?.startingBalance ?? 0;

  const dashboard = useMemo(() => {
    const monthStart = dateKey(startOfMonth(now));
    const monthEnd = dateKey(endOfMonth(now));
    const currentWeekStart = startOfWeek(now, appPreferences);
    const currentWeekEnd = endOfWeek(now, appPreferences);
    const weekStart = dateKey(currentWeekStart);
    const weekEnd = dateKey(currentWeekEnd);
    const beforeMonth = periodTrades(
      trades,
      null,
      dateKey(addDays(startOfMonth(now), -1)),
    );
    const beforeWeek = periodTrades(
      trades,
      null,
      dateKey(addDays(currentWeekStart, -1)),
    );
    const totalTrades = periodTrades(trades, null, null);
    const monthTrades = periodTrades(trades, monthStart, monthEnd);
    const weekTrades = periodTrades(trades, weekStart, weekEnd);

    const total = buildSummary({
      commissionPerLot,
      currency,
      appPreferences,
      end: null,
      id: "total",
      label: "Total",
      outcomes: buildTradeOutcomes(
        totalTrades,
        commissionPerLot,
        appPreferences,
      ),
      selectedTrades: totalTrades,
      startingBalance: accountStart,
      subtitle: "All data",
    });
    const month = buildSummary({
      commissionPerLot,
      currency,
      appPreferences,
      end: monthEnd,
      id: "month",
      label: "Current month",
      outcomes: buildMonthOutcomes(trades, now, commissionPerLot),
      selectedTrades: monthTrades,
      startingBalance: accountStart + netPnl(beforeMonth, commissionPerLot),
      subtitle: monthLabel(now),
    });
    const week = buildSummary({
      commissionPerLot,
      currency,
      appPreferences,
      end: weekEnd,
      id: "week",
      label: "Current week",
      outcomes: buildWeekOutcomes(
        trades,
        now,
        commissionPerLot,
        appPreferences,
      ),
      selectedTrades: weekTrades,
      startingBalance: accountStart + netPnl(beforeWeek, commissionPerLot),
      subtitle: formatDateRangeValue(weekStart, weekEnd, appPreferences),
    });
    const monthlyCharts = buildMonthlyBalanceCharts(
      totalTrades,
      accountStart,
      commissionPerLot,
      now,
      appPreferences,
    );
    const weeklyCards = buildWeeklyBalanceCards(
      totalTrades,
      accountStart,
      commissionPerLot,
      currency,
      now,
      appPreferences,
    );

    return {
      monthDaily: buildDailyBalanceHistory(
        monthTrades,
        month.startingBalance,
        commissionPerLot,
        startOfMonth(now),
        endOfMonth(now),
        now,
        appPreferences,
        true,
      ),
      month,
      monthRankings: buildRankingStats(
        monthTrades,
        commissionPerLot,
        appPreferences,
      ),
      monthlyCharts,
      total,
      totalDaily: buildTotalBalanceHistory(
        totalTrades,
        accountStart,
        commissionPerLot,
        now,
        appPreferences,
      ),
      totalRankings: buildRankingStats(
        totalTrades,
        commissionPerLot,
        appPreferences,
      ),
      weekRankings: buildRankingStats(
        weekTrades,
        commissionPerLot,
        appPreferences,
      ),
      week,
      weeklyCards,
    };
  }, [accountStart, commissionPerLot, currency, appPreferences, now, trades]);

  const tabSummary =
    activeTab === "month"
      ? dashboard.month
      : activeTab === "week"
        ? dashboard.week
        : dashboard.total;
  const tabRankings =
    activeTab === "month"
      ? dashboard.monthRankings
      : activeTab === "week"
        ? dashboard.weekRankings
        : dashboard.totalRankings;
  const sourceDetailRows = useMemo(
    () =>
      rateRowsWithLabels(
        dashboard.total.rateGroups.strategy.rows,
        selectedAccount?.accountType === "system"
          ? educators.map((educator) => educator.name)
          : strategies.map((strategy) => strategy.name),
      ),
    [
      dashboard.total.rateGroups.strategy.rows,
      educators,
      selectedAccount?.accountType,
      strategies,
    ],
  );
  if (selectedAccount?.accountType === "backtesting") {
    return <BacktestingDashboard trades={trades} />;
  }
  const sourceLabel =
    selectedAccount?.accountType === "system" ? "Educator" : "Strategy";
  const currentMonthChart = dashboard.monthlyCharts[
    dashboard.monthlyCharts.length - 1
  ] ?? {
    growth: dashboard.month.growth,
    id: dateKey(startOfMonth(now)),
    label: monthLabel(now),
    points: dashboard.monthDaily,
  };
  const currentWeekCard = dashboard.weeklyCards[
    dashboard.weeklyCards.length - 1
  ] ?? {
    id: dateKey(startOfWeek(now, appPreferences)),
    label: formatDateRangeValue(
      dateKey(startOfWeek(now, appPreferences)),
      dateKey(endOfWeek(now, appPreferences)),
      appPreferences,
    ),
    points: buildDailyBalanceHistory(
      dashboard.week.trades,
      dashboard.week.startingBalance,
      commissionPerLot,
      startOfWeek(now, appPreferences),
      endOfWeek(now, appPreferences),
      now,
      appPreferences,
      true,
    ),
    summary: dashboard.week,
    weekNumber: weekNumber(startOfWeek(now, appPreferences)),
  };
  const activeChart =
    activeTab === "total"
      ? {
          growth: dashboard.total.growth,
          onOpen: undefined,
          points: dashboard.totalDaily,
          scope: "total" as const,
          title: "Total balance",
        }
      : activeTab === "week"
        ? {
            growth: currentWeekCard.summary.growth,
            onOpen: () => setChartDetailKind("week"),
            points: currentWeekCard.points,
            scope: "week" as const,
            title: "Week balance",
          }
        : {
            growth: currentMonthChart.growth,
            onOpen: () => setChartDetailKind("month"),
            points: currentMonthChart.points,
            scope: "month" as const,
            title: "Daily balance",
          };

  return (
    <div className="dashboard dashboard-redesign">
      <section className="dash-summary-stack" aria-label="Dashboard summaries">
        <SummaryBand
          appPreferences={appPreferences}
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.total}
        />
        <SummaryBand
          appPreferences={appPreferences}
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.month}
        />
        <SummaryBand
          appPreferences={appPreferences}
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.week}
        />
      </section>

      <section className="dash-workspace panel">
        <header className="dash-workspace-header">
          <div className="tab-bar" role="tablist" aria-label="Dashboard detail">
            {DASHBOARD_TABS.map((tab) => (
              <button
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span>
            {activeTab === "statistics"
              ? "Click a card for detail"
              : tabSummary.endLabel}
          </span>
        </header>

        {activeTab === "statistics" ? (
          <div className="dash-stat-grid">
            <RateStatsCard
              title="Days"
              leaders={dashboard.total.rateGroups.day}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.day.rows,
                  scope: "day",
                  title: "Day statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Sessions"
              leaders={dashboard.total.rateGroups.session}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.session.rows,
                  scope: "session",
                  title: "Session statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Time of day"
              leaders={dashboard.total.rateGroups.time}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.time.rows,
                  scope: "time",
                  title: "Time statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Direction"
              leaders={dashboard.total.rateGroups.direction}
              variant="buySell"
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.direction.rows,
                  scope: "direction",
                  title: "Direction statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Instrument"
              leaders={dashboard.total.rateGroups.pair}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.pair.rows,
                  title: "Instrument statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title={sourceLabel}
              leaders={dashboard.total.rateGroups.strategy}
              variant="simple"
              onOpen={() =>
                setDetail({
                  rows: sourceDetailRows,
                  title: `${sourceLabel} statistics`,
                  type: "rate",
                })
              }
            />
          </div>
        ) : (
          <div className="dash-workspace-grid">
            <ChartPanel
              currency={currency}
              appPreferences={appPreferences}
              growth={activeChart.growth}
              icon={<LineChart size={14} aria-hidden="true" />}
              onOpen={activeChart.onOpen}
              points={activeChart.points}
              scope={activeChart.scope}
              title={activeChart.title}
            />
            <section className="panel dash-graph-panel">
              <header className="panel-header">
                <h3>
                  <BarChart3 size={14} aria-hidden="true" />
                  Statistics
                </h3>
                <span className="panel-tag">{tabSummary.closed} closed</span>
              </header>
              <div className="dash-stat-strip">
                <div className="dash-stat-column">
                  <h4>Winning</h4>
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning trade"
                    rows={tabRankings.winningTrades}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningTrades,
                        title: `${tabSummary.labels.title} top 10 winning trades`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning day"
                    rows={tabRankings.winningDays}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningDays,
                        title: `${tabSummary.labels.title} top 10 winning days`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning week"
                    rows={tabRankings.winningWeeks}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningWeeks,
                        title: `${tabSummary.labels.title} top 10 winning weeks`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning month"
                    rows={tabRankings.winningMonths}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningMonths,
                        title: `${tabSummary.labels.title} top 10 winning months`,
                        type: "ranking",
                      })
                    }
                  />
                </div>
                <div className="dash-stat-column">
                  <h4>Losing</h4>
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing trade"
                    rows={tabRankings.losingTrades}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingTrades,
                        title: `${tabSummary.labels.title} top 10 losing trades`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing day"
                    rows={tabRankings.losingDays}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingDays,
                        title: `${tabSummary.labels.title} top 10 losing days`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing week"
                    rows={tabRankings.losingWeeks}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingWeeks,
                        title: `${tabSummary.labels.title} top 10 losing weeks`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing month"
                    rows={tabRankings.losingMonths}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingMonths,
                        title: `${tabSummary.labels.title} top 10 losing months`,
                        type: "ranking",
                      })
                    }
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </section>

      <StatsDetailModal
        currency={currency}
        appPreferences={appPreferences}
        detail={detail}
        onClose={() => setDetail(null)}
      />
      {chartDetailKind === "month" ? (
        <ChartHistoryDetailModal
          charts={dashboard.monthlyCharts}
          currency={currency}
          currentYear={now.getFullYear().toString()}
          appPreferences={appPreferences}
          onClose={() => setChartDetailKind(null)}
        />
      ) : null}
      {chartDetailKind === "week" ? (
        <WeekHistoryDetailModal
          appPreferences={appPreferences}
          cards={dashboard.weeklyCards}
          currency={currency}
          currentYear={now.getFullYear().toString()}
          onClose={() => setChartDetailKind(null)}
          onOpenGraph={(card) => setWeekGraphDetail(card)}
        />
      ) : null}
      <WeekChartDetailModal
        card={weekGraphDetail}
        currency={currency}
        appPreferences={appPreferences}
        onClose={() => setWeekGraphDetail(null)}
      />
    </div>
  );
}
