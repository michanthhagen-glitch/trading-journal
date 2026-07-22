import type { Trade } from "../../shared/db/database";
import {
  dateTimeMinutesValue,
  dateTimeWeekdayShortLabel,
  formatCompactDateValue,
  formatCompactCurrencyValue,
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
import {
  addDays,
  addMonths,
  dateKey,
  endOfMonth,
  parseDate,
  startOfMonth,
} from "../../shared/localDates";

export { addDays, dateKey, endOfMonth, startOfMonth };

export type Tone = "flat" | "negative" | "positive" | "warning";
export type Outcome = "break-even" | "empty" | "loss" | "win";
export type SummaryScope = "month" | "total" | "week";
export type DashboardTab = "month" | "statistics" | "total" | "week";

export type HistoryPoint = {
  label: string;
  meta: string;
  pnl: number | null;
  value: number | null;
};

export type RingSegment = {
  color: string;
  label: string;
  valueText: string;
  weight: number;
};

export type OutcomePoint = {
  label: string;
  meta: string;
  outcome: Outcome;
  value: number;
};

export type RateRow = {
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

export type RateLeaders = {
  bestWin: RateRow | null;
  rows: RateRow[];
  worstWin: RateRow | null;
};

export type RankingRow = {
  id: string;
  label: string;
  meta: string;
  trades: number;
  value: number;
};

export type RankingStats = {
  losingDays: RankingRow[];
  losingMonths: RankingRow[];
  losingTrades: RankingRow[];
  losingWeeks: RankingRow[];
  winningDays: RankingRow[];
  winningMonths: RankingRow[];
  winningTrades: RankingRow[];
  winningWeeks: RankingRow[];
};

export type MonthlyBalanceChart = {
  growth: number | null;
  id: string;
  label: string;
  points: HistoryPoint[];
};

export type WeeklyBalanceCard = {
  id: string;
  label: string;
  points: HistoryPoint[];
  summary: SummaryData;
  weekNumber: number;
};

export type SummaryData = {
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

export type DetailState =
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

export const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "statistics", label: "Statistics" },
];

export const DIRECTION_LABELS = ["Long", "Short"];
export const RING_CIRCUMFERENCE = 263.89;
export const SESSION_LABELS = [
  "Tokyo",
  "Tokyo-London",
  "London",
  "London/New York",
  "New York",
  "New York-Tokyo",
];
export const TIME_INTERVAL_LABELS = Array.from({ length: 96 }, (_, index) =>
  timeIntervalLabel(index),
);
export type RateDetailScope = "day" | "direction" | "session" | "time";

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function startOfWeek(date: Date, appPreferences: AppPreferences) {
  return startOfWeekByPreference(date, appPreferences);
}

export function endOfWeek(date: Date, appPreferences: AppPreferences) {
  return addDays(startOfWeek(date, appPreferences), 6);
}

export function weekNumber(date: Date) {
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

export function weekTickLabel(value: string) {
  const weekday = parseDate(value).getDay();
  return ["S", "M", "T", "W", "T", "F", "S"][weekday] ?? value.slice(5);
}

export function monthLabel(date: Date, format: "long" | "short" = "long") {
  return new Intl.DateTimeFormat(undefined, {
    month: format,
    year: format === "long" ? "numeric" : undefined,
  }).format(date);
}

export function isClosedTrade(trade: Trade) {
  return Boolean(trade.exit.result) || trade.pnl !== null;
}

export function tradeTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "--:--";
}

export function tradeSortValue(trade: Trade) {
  return `${trade.date} ${tradeTime(trade)}`;
}

export function clockLabel(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

export function timeIntervalLabel(index: number) {
  const start = index * 15;
  return `${clockLabel(start)}-${clockLabel(start + 15)}`;
}

export function minutesFromTrade(trade: Trade, appPreferences: AppPreferences) {
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

export function hourFromTrade(trade: Trade, appPreferences: AppPreferences) {
  return Math.floor(minutesFromTrade(trade, appPreferences) / 60);
}

export function sessionLabel(trade: Trade, appPreferences: AppPreferences) {
  const hour = hourFromTrade(trade, appPreferences);
  if (hour < 7) return "Tokyo";
  if (hour < 8) return "Tokyo-London";
  if (hour < 13) return "London";
  if (hour < 17) return "London/New York";
  if (hour < 21) return "New York";
  return "New York-Tokyo";
}

export function timeOfDayLabel(trade: Trade, appPreferences: AppPreferences) {
  return TIME_INTERVAL_LABELS[
    Math.floor(minutesFromTrade(trade, appPreferences) / 15)
  ];
}

export function dayLabel(trade: Trade, appPreferences: AppPreferences) {
  return (
    dateTimeWeekdayShortLabel(trade.date, tradeTime(trade), appPreferences) ??
    weekdayShortLabel(trade.date)
  );
}

export function directionLabel(trade: Trade) {
  return trade.direction === "long" ? "Long" : "Short";
}

export function pairLabel(trade: Trade) {
  return trade.pair.trim() || "No instrument";
}

export function strategyLabel(trade: Trade) {
  return trade.preTrade.strategy.trim() || "Unassigned";
}

export function fmtCurrency(
  value: number,
  currency: string,
  appPreferences: AppPreferences,
  signed = false,
) {
  return formatCurrencyValue(value, currency, appPreferences, { signed });
}

export function fmtShortCurrency(
  value: number,
  currency: string,
  appPreferences: AppPreferences,
) {
  return formatCompactCurrencyValue(value, currency, appPreferences, {
    signed: true,
  });
}

export function fmtAxisCurrency(
  value: number,
  currency: string,
  appPreferences: AppPreferences,
) {
  return formatCompactCurrencyValue(value, currency, appPreferences);
}

export function fmtPercent(
  value: number | null,
  appPreferences: AppPreferences,
  signed = true,
) {
  return formatPercentValue(value, appPreferences, { signed });
}

export function fmtCompactPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(0)}%`;
}

export function fmtRangePercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

export function fmtRangeAmount(
  value: number | null,
  balance: number,
  currency: string,
  appPreferences: AppPreferences,
) {
  if (value === null || !Number.isFinite(value)) return "-";
  return fmtShortCurrency((balance * value) / 100, currency, appPreferences);
}

export function toneFromNumber(value: number | null): Tone {
  if (value === null || value === 0) return "flat";
  return value > 0 ? "positive" : "negative";
}

export function outcomeFromValue(value: number, trades = 1): Outcome {
  if (trades === 0) return "empty";
  if (value > 0) return "win";
  if (value < 0) return "loss";
  return "break-even";
}

export function niceChartStep(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function periodTrades(
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

export function commissionFor(trade: Trade, commissionPerLot: number) {
  return (trade.entry.lotSize ?? 0) * commissionPerLot;
}

export function grossPnl(trades: Trade[]) {
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
}

export function netPnl(trades: Trade[], commissionPerLot: number) {
  return (
    grossPnl(trades) -
    trades.reduce(
      (sum, trade) => sum + commissionFor(trade, commissionPerLot),
      0,
    )
  );
}

export function tradeNetValue(trade: Trade, commissionPerLot: number) {
  return (trade.pnl ?? 0) - commissionFor(trade, commissionPerLot);
}

export function weekLabelFromDate(
  value: string,
  appPreferences: AppPreferences,
) {
  const date = parseDate(value);
  const start = startOfWeek(date, appPreferences);
  const end = endOfWeek(date, appPreferences);
  return formatDateRangeValue(dateKey(start), dateKey(end), appPreferences);
}

export function rankedRows(rows: RankingRow[], direction: "loss" | "win") {
  return rows
    .filter((row) => (direction === "win" ? row.value > 0 : row.value < 0))
    .sort((a, b) =>
      direction === "win" ? b.value - a.value : a.value - b.value,
    )
    .slice(0, 10);
}

export function buildTradeRanking(
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

export function buildGroupedRanking(
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

export function buildRankingStats(
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

export function buildDailyBalanceHistory(
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

export function buildMonthlyBalanceCharts(
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

export function buildTotalBalanceHistory(
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

export function buildWeeklyBalanceCards(
  trades: Trade[],
  startingBalance: number,
  commissionPerLot: number,
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
        appPreferences,
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

export function rateGroups(
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

export function emptyRateRow(label: string): RateRow {
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

export function detailRateRows(
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

export function rateRowsWithLabels(rows: RateRow[], labels: string[]) {
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

export function buildTradeOutcomes(
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

export function buildMonthOutcomes(
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

export function buildWeekOutcomes(
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

export function buildSummary({
  commissionPerLot,
  appPreferences,
  id,
  label,
  outcomes,
  selectedTrades,
  startingBalance,
  subtitle,
}: {
  commissionPerLot: number;
  appPreferences: AppPreferences;
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

export function buildDashboardViewModel({
  accountStart,
  appPreferences,
  commissionPerLot,
  now,
  trades,
}: {
  accountStart: number;
  appPreferences: AppPreferences;
  commissionPerLot: number;
  now: Date;
  trades: Trade[];
}) {
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
    appPreferences,
    id: "total",
    label: "Total",
    outcomes: buildTradeOutcomes(totalTrades, commissionPerLot, appPreferences),
    selectedTrades: totalTrades,
    startingBalance: accountStart,
    subtitle: "All data",
  });
  const month = buildSummary({
    commissionPerLot,
    appPreferences,
    id: "month",
    label: "Current month",
    outcomes: buildMonthOutcomes(trades, now, commissionPerLot),
    selectedTrades: monthTrades,
    startingBalance: accountStart + netPnl(beforeMonth, commissionPerLot),
    subtitle: monthLabel(now),
  });
  const week = buildSummary({
    commissionPerLot,
    appPreferences,
    id: "week",
    label: "Current week",
    outcomes: buildWeekOutcomes(trades, now, commissionPerLot, appPreferences),
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
}
