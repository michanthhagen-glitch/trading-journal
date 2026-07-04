import { BarChart3, ChevronRight, LineChart, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ModuleContext } from "../../app/types";
import {
  listAccountSetup,
  listTrades,
  type RiskManagementPlan,
  type Trade,
} from "../../shared/db/database";

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
      scope?: "day";
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

const RING_CIRCUMFERENCE = 263.89;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
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

function hourFromTrade(trade: Trade) {
  const [hour] = tradeTime(trade).split(":").map(Number);
  return Number.isFinite(hour) ? hour : 0;
}

function sessionLabel(trade: Trade) {
  const hour = hourFromTrade(trade);
  if (hour < 7) return "Asia";
  if (hour < 13) return "London";
  if (hour < 21) return "New York";
  return "Late";
}

function timeOfDayLabel(trade: Trade) {
  const hour = hourFromTrade(trade);
  if (hour < 4) return "00-04";
  if (hour < 8) return "04-08";
  if (hour < 12) return "08-12";
  if (hour < 16) return "12-16";
  if (hour < 20) return "16-20";
  return "20-24";
}

function dayLabel(trade: Trade) {
  const day = parseDate(trade.date).getDay();
  return WEEKDAY_LABELS[day === 0 ? 6 : day - 1];
}

function directionLabel(trade: Trade) {
  return trade.direction === "long" ? "Buy" : "Sell";
}

function pairLabel(trade: Trade) {
  return trade.pair.trim() || "No pair";
}

function strategyLabel(trade: Trade) {
  return trade.preTrade.strategy.trim() || "No strategy";
}

function fmtCurrency(value: number, currency = "USD", signed = false) {
  const amount = new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Math.abs(value));

  if (!signed) return amount;
  if (value === 0) return amount;
  return `${value > 0 ? "+" : "-"} ${amount}`;
}

function fmtShortCurrency(value: number, currency = "USD") {
  const amount = new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Math.abs(value));

  if (value === 0) return amount;
  return `${value > 0 ? "+" : "-"}${amount}`;
}

function currencySymbol(currency = "USD") {
  return (
    new Intl.NumberFormat(undefined, {
      currency,
      maximumFractionDigits: 0,
      style: "currency",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

function fmtAxisCurrency(value: number, currency = "USD") {
  const sign = value < 0 ? "-" : "";
  const amount = Math.abs(value);
  const symbol = currencySymbol(currency);

  if (amount >= 1000) {
    const short = amount / 1000;
    return `${sign}${symbol}${Number.isInteger(short) ? short.toFixed(0) : short.toFixed(1)}k`;
  }

  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function fmtPercent(value: number | null, signed = true) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${signed && value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
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
) {
  if (value === null || !Number.isFinite(value)) return "-";
  return fmtShortCurrency((balance * value) / 100, currency);
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

function weekLabelFromDate(value: string) {
  const date = parseDate(value);
  return `${dateKey(startOfWeek(date)).slice(5)} to ${dateKey(endOfWeek(date)).slice(5)}`;
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
) {
  const rows = trades.filter(isClosedTrade).map((trade) => ({
    id: trade.id,
    label: trade.pair,
    meta: `${trade.date} ${tradeTime(trade)} ${trade.direction}`,
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
): RankingStats {
  return {
    losingDays: buildGroupedRanking(
      trades,
      commissionPerLot,
      "loss",
      (trade) => ({
        id: trade.date,
        label: trade.date,
        meta: dayLabel(trade),
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
    losingTrades: buildTradeRanking(trades, commissionPerLot, "loss"),
    losingWeeks: buildGroupedRanking(
      trades,
      commissionPerLot,
      "loss",
      (trade) => ({
        id: dateKey(startOfWeek(parseDate(trade.date))),
        label: weekLabelFromDate(trade.date),
        meta: "Week",
      }),
    ),
    winningDays: buildGroupedRanking(
      trades,
      commissionPerLot,
      "win",
      (trade) => ({
        id: trade.date,
        label: trade.date,
        meta: dayLabel(trade),
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
    winningTrades: buildTradeRanking(trades, commissionPerLot, "win"),
    winningWeeks: buildGroupedRanking(
      trades,
      commissionPerLot,
      "win",
      (trade) => ({
        id: dateKey(startOfWeek(parseDate(trade.date))),
        label: weekLabelFromDate(trade.date),
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
  includeTomorrow = false,
) {
  const closed = [...trades]
    .filter(isClosedTrade)
    .sort((a, b) => tradeSortValue(a).localeCompare(tradeSortValue(b)));

  const startKey = dateKey(start);
  const startPoint: HistoryPoint = {
    label: startKey.slice(5),
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
      label: key.slice(5),
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
            label: dateKey(tomorrow).slice(5),
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
    true,
  );
}

function buildWeeklyBalanceCards(
  trades: Trade[],
  startingBalance: number,
  commissionPerLot: number,
  currency: string,
  now: Date,
): WeeklyBalanceCard[] {
  const datedTrades = [...trades].sort((a, b) =>
    tradeSortValue(a).localeCompare(tradeSortValue(b)),
  );
  const firstWeek =
    datedTrades.length > 0
      ? startOfWeek(parseDate(datedTrades[0].date))
      : startOfWeek(now);
  const currentWeek = startOfWeek(now);
  const cards: WeeklyBalanceCard[] = [];

  for (
    let cursor = firstWeek;
    dateKey(cursor) <= dateKey(currentWeek);
    cursor = addDays(cursor, 7)
  ) {
    const weekStart = startOfWeek(cursor);
    const weekEnd = endOfWeek(cursor);
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
    const label = `${dateKey(weekStart).slice(5)} to ${dateKey(weekEnd).slice(
      5,
    )}`;
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
        isCurrentWeek,
      ),
      summary: buildSummary({
        commissionPerLot,
        currency,
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

function detailRateRows(rows: RateRow[], scope?: "day") {
  if (scope !== "day") return rows;
  const rowMap = new Map(rows.map((row) => [row.label, row]));
  return WEEKDAY_LABELS.map(
    (label) => rowMap.get(label) ?? emptyRateRow(label),
  );
}

function buildTradeOutcomes(
  trades: Trade[],
  commissionPerLot: number,
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
        label: trade.pair,
        meta: `${trade.date.slice(5)} ${trade.direction}`,
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
): OutcomePoint[] {
  const currentWeek = startOfWeek(now);
  return Array.from({ length: 10 }, (_, index) =>
    addDays(currentWeek, (index - 9) * 7),
  ).map((week) => {
    const weekTrades = periodTrades(
      trades,
      dateKey(startOfWeek(week)),
      dateKey(endOfWeek(week)),
    );
    const value = netPnl(weekTrades, commissionPerLot);
    return {
      label: dateKey(week).slice(5),
      meta: `${weekTrades.length} trades`,
      outcome: outcomeFromValue(value, weekTrades.length),
      value,
    };
  });
}

function buildSummary({
  commissionPerLot,
  currency,
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
      day: rateGroups(closed, dayLabel),
      direction: rateGroups(closed, directionLabel),
      pair: rateGroups(closed, pairLabel),
      session: rateGroups(closed, sessionLabel),
      strategy: rateGroups(closed, strategyLabel),
      time: rateGroups(closed, timeOfDayLabel),
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
  currency,
  label,
  summary,
  value,
}: {
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
      <em>{fmtRangeAmount(value, summary.startingBalance, currency)}</em>
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
  currency,
  summary,
}: {
  currency: string;
  summary: SummaryData;
}) {
  return (
    <div className="dash-balance-stack">
      <div>
        <span>Starting</span>
        <strong>{fmtCurrency(summary.startingBalance, currency)}</strong>
      </div>
      <div>
        <span>Current</span>
        <strong className={`primary ${toneFromNumber(summary.netPnl)}`}>
          {fmtCurrency(summary.balance, currency)}
        </strong>
      </div>
      <div>
        <span>Growth</span>
        <strong className={toneFromNumber(summary.growth)}>
          {fmtPercent(summary.growth)}
        </strong>
      </div>
    </div>
  );
}

function PnlRing({
  currency,
  summary,
}: {
  currency: string;
  summary: SummaryData;
}) {
  return (
    <HoverRing
      centerLabel="net"
      centerValue={fmtShortCurrency(summary.netPnl, currency)}
      segments={[
        {
          color: summary.grossPnl < 0 ? "#f08688" : "#6cd49a",
          label: "gross",
          valueText: fmtShortCurrency(summary.grossPnl, currency),
          weight: Math.abs(summary.grossPnl),
        },
        {
          color: "#f5b86c",
          label: "commission",
          valueText: fmtShortCurrency(summary.commission, currency),
          weight: Math.abs(summary.commission),
        },
      ]}
    />
  );
}

function OutcomeBoxes({
  currency,
  points,
  title,
}: {
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
            title={`${point.label} ${point.meta}: ${fmtCurrency(point.value, currency, true)}`}
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
  currency,
  riskPlan,
  summary,
}: {
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
        currency={currency}
        label="Min"
        summary={summary}
        value={riskMin}
      />
      <RiskCell
        currency={currency}
        label="Mid"
        summary={summary}
        value={riskMid}
      />
      <RiskCell
        currency={currency}
        label="Max"
        summary={summary}
        value={riskMax}
      />
      <strong>Goal</strong>
      <RiskCell
        currency={currency}
        label="Min"
        summary={summary}
        value={riskPlan?.weeklyGoalMinPercent ?? null}
      />
      <RiskCell
        currency={currency}
        label="Mid"
        summary={summary}
        value={riskPlan?.weeklyGoalMidPercent ?? null}
      />
      <RiskCell
        currency={currency}
        label="Max"
        summary={summary}
        value={riskPlan?.weeklyGoalMaxPercent ?? null}
      />
    </div>
  );
}

function SummaryBand({
  currency,
  riskPlan,
  summary,
}: {
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
        <BalanceStack currency={currency} summary={summary} />
        {summary.id === "week" ? (
          <RiskGoalGrid
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
          <PnlRing currency={currency} summary={summary} />
        </div>
        <div className="dash-ring-tile">
          <TradeRing summary={summary} />
        </div>
      </div>
      <OutcomeBoxes
        currency={currency}
        points={summary.outcomes}
        title={summary.labels.history}
      />
    </article>
  );
}

function ChartPanel({
  currency,
  growth,
  icon,
  onOpen,
  points,
  scope,
  title,
}: {
  currency: string;
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
                      {fmtAxisCurrency(value, currency)}
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
                  Starting balance: {fmtCurrency(startingBalance, currency)}
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
                    {item.point.meta}: P&L{" "}
                    {fmtCurrency(item.point.pnl ?? 0, currency, true)}. Balance{" "}
                    {fmtCurrency(item.point.value, currency)}.
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
              <strong>Growth {fmtPercent(growth)}</strong>
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
  const buy = leaders.rows.find((row) => row.label === "Buy") ?? null;
  const sell = leaders.rows.find((row) => row.label === "Sell") ?? null;

  if (variant !== "simple") {
    const left = variant === "buySell" ? buy : leaders.bestWin;
    const right = variant === "buySell" ? sell : leaders.worstWin;

    return (
      <button
        className="dash-stat-card is-split"
        type="button"
        onClick={onOpen}
      >
        <span>{title}</span>
        <div className="dash-stat-split">
          <RateStatMini
            caption={variant === "buySell" ? "Buy" : "Best win rate"}
            row={left}
          />
          <RateStatMini
            caption={variant === "buySell" ? "Sell" : "Worst win rate"}
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
  currency,
  onOpen,
  rows,
  title,
}: {
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
          ? `${fmtCurrency(top.value, currency, true)} · ${top.meta}`
          : "No data"}
      </small>
    </button>
  );
}

function StatsDetailModal({
  currency,
  detail,
  onClose,
}: {
  currency: string;
  detail: DetailState;
  onClose: () => void;
}) {
  const [rateView, setRateView] = useState<"chart" | "table">("table");
  useEffect(() => {
    setRateView("table");
  }, [detail?.title]);

  if (!detail) return null;

  const rateRows =
    detail.type === "rate" ? detailRateRows(detail.rows, detail.scope) : [];
  const rateNameLabel =
    detail.type === "rate" && detail.scope === "day" ? "Day" : "Name";
  const modalClassName =
    detail.type === "rate"
      ? `modal-card dash-detail-modal is-rate-${rateView}`
      : "modal-card dash-detail-modal is-ranking";

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-label={detail.title}
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className={modalClassName}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>{detail.title}</h3>
            <p className="modal-subtitle">
              {detail.type === "rate"
                ? "Detailed win, loss, and P&L view."
                : "Top 10 ranked by net P&L."}
            </p>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close dashboard detail"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">
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
                        {fmtCurrency(row.pnl, currency, true)}
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
                    {fmtCurrency(row.value, currency, true)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
  onClose,
}: {
  charts: MonthlyBalanceChart[];
  currency: string;
  currentYear: string;
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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-label="Monthly balance chart history"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="modal-card dash-chart-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>Monthly balance charts</h3>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close monthly balance chart history"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
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
        <div className="modal-body dash-chart-detail-body">
          {visibleCharts.map((chart) => (
            <ChartPanel
              currency={currency}
              growth={chart.growth}
              icon={<LineChart size={14} aria-hidden="true" />}
              key={chart.id}
              points={chart.points}
              scope="month"
              title={chart.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekHistoryDetailModal({
  cards,
  currency,
  currentYear,
  onClose,
  onOpenGraph,
}: {
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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-label="Weekly balance history"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="modal-card dash-chart-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>Weekly balance history</h3>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close weekly balance history"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
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
        <div className="modal-body dash-week-detail-body">
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
                        {summary.wins}W / {summary.losses}L /{" "}
                        {summary.breakEvens}BE
                      </span>
                      <span>Growth {fmtPercent(summary.growth)}</span>
                      <strong className={toneFromNumber(summary.netPnl)}>
                        {fmtCurrency(summary.netPnl, currency, true)}
                      </strong>
                    </span>
                  </button>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekChartDetailModal({
  card,
  currency,
  onClose,
}: {
  card: WeeklyBalanceCard | null;
  currency: string;
  onClose: () => void;
}) {
  if (!card) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-label={`Week ${card.weekNumber} ${card.label} balance graph`}
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="modal-card dash-week-chart-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h3>
              Week {card.weekNumber} · {card.label}
            </h3>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close weekly balance graph"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body dash-week-chart-body">
          <ChartPanel
            currency={currency}
            growth={card.summary.growth}
            icon={<LineChart size={14} aria-hidden="true" />}
            points={card.points}
            scope="week"
            title="Week balance"
          />
        </div>
      </div>
    </div>
  );
}

export function DashboardModule({
  selectedAccount,
  selectedAccountId,
}: ModuleContext) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [riskPlan, setRiskPlan] = useState<RiskManagementPlan | null>(null);
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
    const weekStart = dateKey(startOfWeek(now));
    const weekEnd = dateKey(endOfWeek(now));
    const beforeMonth = periodTrades(
      trades,
      null,
      dateKey(addDays(startOfMonth(now), -1)),
    );
    const beforeWeek = periodTrades(
      trades,
      null,
      dateKey(addDays(startOfWeek(now), -1)),
    );
    const totalTrades = periodTrades(trades, null, null);
    const monthTrades = periodTrades(trades, monthStart, monthEnd);
    const weekTrades = periodTrades(trades, weekStart, weekEnd);

    const total = buildSummary({
      commissionPerLot,
      currency,
      end: null,
      id: "total",
      label: "Total",
      outcomes: buildTradeOutcomes(totalTrades, commissionPerLot),
      selectedTrades: totalTrades,
      startingBalance: accountStart,
      subtitle: "All data",
    });
    const month = buildSummary({
      commissionPerLot,
      currency,
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
      end: weekEnd,
      id: "week",
      label: "Current week",
      outcomes: buildWeekOutcomes(trades, now, commissionPerLot),
      selectedTrades: weekTrades,
      startingBalance: accountStart + netPnl(beforeWeek, commissionPerLot),
      subtitle: `${weekStart.slice(5)} to ${weekEnd.slice(5)}`,
    });
    const monthlyCharts = buildMonthlyBalanceCharts(
      totalTrades,
      accountStart,
      commissionPerLot,
      now,
    );
    const weeklyCards = buildWeeklyBalanceCards(
      totalTrades,
      accountStart,
      commissionPerLot,
      currency,
      now,
    );

    return {
      monthDaily: buildDailyBalanceHistory(
        monthTrades,
        month.startingBalance,
        commissionPerLot,
        startOfMonth(now),
        endOfMonth(now),
        now,
        true,
      ),
      month,
      monthRankings: buildRankingStats(monthTrades, commissionPerLot),
      monthlyCharts,
      total,
      totalDaily: buildTotalBalanceHistory(
        totalTrades,
        accountStart,
        commissionPerLot,
        now,
      ),
      totalRankings: buildRankingStats(totalTrades, commissionPerLot),
      weekRankings: buildRankingStats(weekTrades, commissionPerLot),
      week,
      weeklyCards,
    };
  }, [accountStart, commissionPerLot, currency, now, trades]);

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
    id: dateKey(startOfWeek(now)),
    label: `${dateKey(startOfWeek(now)).slice(5)} to ${dateKey(
      endOfWeek(now),
    ).slice(5)}`,
    points: buildDailyBalanceHistory(
      dashboard.week.trades,
      dashboard.week.startingBalance,
      commissionPerLot,
      startOfWeek(now),
      endOfWeek(now),
      now,
      true,
    ),
    summary: dashboard.week,
    weekNumber: weekNumber(startOfWeek(now)),
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
      <header className="page-header dashboard-header-compact">
        <div>
          <h2>Dashboard</h2>
          <p className="page-subtitle">
            {selectedAccount
              ? `${selectedAccount.name} - performance, risk, and review.`
              : "No account selected. Showing uncategorized data."}
          </p>
        </div>
        <span className="dashboard-period-pill">{monthLabel(now)}</span>
      </header>

      <section className="dash-summary-stack" aria-label="Dashboard summaries">
        <SummaryBand
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.total}
        />
        <SummaryBand
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.month}
        />
        <SummaryBand
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
                  title: "Time statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Buy / Sell"
              leaders={dashboard.total.rateGroups.direction}
              variant="buySell"
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.direction.rows,
                  title: "Buy / Sell statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Currency pair"
              leaders={dashboard.total.rateGroups.pair}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.pair.rows,
                  title: "Currency pair statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Strategy"
              leaders={dashboard.total.rateGroups.strategy}
              variant="simple"
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.strategy.rows,
                  title: "Strategy statistics",
                  type: "rate",
                })
              }
            />
          </div>
        ) : (
          <div className="dash-workspace-grid">
            <ChartPanel
              currency={currency}
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
        detail={detail}
        onClose={() => setDetail(null)}
      />
      {chartDetailKind === "month" ? (
        <ChartHistoryDetailModal
          charts={dashboard.monthlyCharts}
          currency={currency}
          currentYear={now.getFullYear().toString()}
          onClose={() => setChartDetailKind(null)}
        />
      ) : null}
      {chartDetailKind === "week" ? (
        <WeekHistoryDetailModal
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
        onClose={() => setWeekGraphDetail(null)}
      />
    </div>
  );
}
