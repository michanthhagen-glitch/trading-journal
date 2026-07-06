import { CalendarDays, CalendarRange, Edit3, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ModalShell } from "../../components/ModalShell";
import {
  listJournalRecaps,
  listTrades,
  saveJournalRecap,
  type JournalRecapInput,
  type JournalRecapRow,
  type Trade,
  type TradingAccount,
} from "../../shared/db/database";
import type { ModuleContext } from "../../app/types";
import {
  formatCurrencyValue,
  formatDateRangeValue,
  formatDateValue,
  formatPercentValue,
  formatTimeForDateValue,
  startOfWeekByPreference,
  type AppPreferences,
} from "../../shared/appPreferences";
import { formatTradeName } from "../../shared/tradeNames";

type Cadence = JournalRecapRow["cadence"];

type PeriodRange = {
  anchor: string;
  end: string;
  label: string;
  period: string;
  start: string;
};

type RecapStats = {
  averageActualRr: number | null;
  averageGrade: string;
  averageQuality: number | null;
  bestStrategy: string;
  bestTrade: Trade | null;
  breakEven: number;
  closed: number;
  commonEmotion: string;
  commonMistake: string;
  commonPositive: string;
  growthPercent: number | null;
  losses: number;
  missingRecaps: number;
  netPnl: number | null;
  planFollowed: number;
  planPartial: number;
  planNotFollowed: number;
  recapped: number;
  ruleBreaks: number;
  totalTrades: number;
  winRate: number | null;
  wins: number;
  worstTrade: Trade | null;
};

type CurrentRecapStatus = {
  label: string;
  tone: "done" | "missing" | "missing-danger" | "neutral" | "ongoing";
};

type ManualRecapField = {
  defaultValue?: string;
  key: string;
  label: string;
  placeholder?: string;
  rows?: number;
};

type TagCount = {
  count: number;
  label: string;
};

type PeriodSourceRow = {
  label: string;
  meta: string;
  period: string;
  range: PeriodRange;
  recap: JournalRecapRow | null;
  stats: RecapStats;
  status: CurrentRecapStatus;
};

const CADENCES: { id: Cadence; label: string; icon: ReactNode }[] = [
  { id: "daily", label: "Daily", icon: <CalendarDays size={16} /> },
  { id: "weekly", label: "Weekly", icon: <CalendarRange size={16} /> },
  { id: "monthly", label: "Monthly", icon: <CalendarRange size={16} /> },
];

const DAILY_RECAP_FIELDS: ManualRecapField[] = [
  {
    key: "patterns",
    label: "Patterns noticed",
    placeholder: "What repeated today?",
    rows: 3,
  },
  {
    key: "marketContext",
    label: "Market context",
    placeholder: "Clean, choppy, slow, volatile, news-heavy...",
    rows: 3,
  },
  {
    key: "executionQuality",
    label: "Execution quality",
    placeholder: "How well did you follow the plan?",
    rows: 3,
  },
  {
    key: "mindset",
    label: "Mindset / condition",
    placeholder: "Calm, rushed, tired, focused, distracted...",
    rows: 3,
  },
  {
    key: "mainLesson",
    label: "Main lesson",
    placeholder: "The main thing today taught you",
    rows: 3,
  },
  {
    key: "nextTradingDay",
    label: "Next trading day",
    placeholder: "1-3 concrete rules for tomorrow",
    rows: 3,
  },
];

const DAILY_SCORE_FIELDS: ManualRecapField[] = [
  { key: "planScore", label: "Plan followed", defaultValue: "5" },
  { key: "riskScore", label: "Risk control", defaultValue: "5" },
  { key: "entryScore", label: "Entry quality", defaultValue: "5" },
  { key: "exitScore", label: "Exit quality", defaultValue: "5" },
  { key: "mindsetScore", label: "Mindset", defaultValue: "5" },
];

const PERIOD_SCORE_FIELDS: ManualRecapField[] = [
  { key: "planScore", label: "Plan followed", defaultValue: "5" },
  { key: "riskScore", label: "Risk control", defaultValue: "5" },
  { key: "executionScore", label: "Execution quality", defaultValue: "5" },
  { key: "reviewScore", label: "Review quality", defaultValue: "5" },
  { key: "mindsetScore", label: "Mindset", defaultValue: "5" },
];

const LEGACY_PERIOD_RECAP_FIELDS: ManualRecapField[] = [
  { key: "mistakesMade", label: "Mistakes made" },
  { key: "wentWell", label: "What went well" },
  { key: "couldImprove", label: "What could be done better" },
];

function periodReviewFields(cadence: Cadence): ManualRecapField[] {
  const sourceUnit = cadence === "monthly" ? "week" : "day";
  const nextPeriod = cadence === "monthly" ? "Next month" : "Next week";

  return [
    {
      key: "patterns",
      label: "Patterns noticed",
      placeholder: "What repeated across the period?",
      rows: 3,
    },
    {
      key: "bestPeriod",
      label: `Best ${sourceUnit}`,
      placeholder: `Which ${sourceUnit} worked best and why?`,
      rows: 3,
    },
    {
      key: "needsAttention",
      label: "Needs attention",
      placeholder: "What hurt performance most?",
      rows: 3,
    },
    {
      key: "riskManagement",
      label: "Risk management",
      placeholder: "How clean was risk, sizing, and loss control?",
      rows: 3,
    },
    {
      key: "mindset",
      label: "Mindset / discipline",
      placeholder: "Calm, rushed, focused, impatient...",
      rows: 3,
    },
    {
      key: "mainLesson",
      label: "Main lesson",
      placeholder: "The main thing this period taught you",
      rows: 3,
    },
    {
      key: "nextPeriodFocus",
      label: nextPeriod,
      placeholder: "1-3 concrete focus points",
      rows: 3,
    },
  ];
}

function reviewFieldsForCadence(cadence: Cadence) {
  return cadence === "daily" ? DAILY_RECAP_FIELDS : periodReviewFields(cadence);
}

function scoreFieldsForCadence(cadence: Cadence) {
  return cadence === "daily" ? DAILY_SCORE_FIELDS : PERIOD_SCORE_FIELDS;
}

function recapFieldsForCadence(cadence: Cadence) {
  return [
    ...reviewFieldsForCadence(cadence),
    ...scoreFieldsForCadence(cadence),
  ];
}

function reviewHeading(cadence: Cadence) {
  return `${cadence[0].toUpperCase()}${cadence.slice(1)} review`;
}

function scoreHeading(cadence: Cadence) {
  return `${cadence[0].toUpperCase()}${cadence.slice(1)} score`;
}

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
  )
    return new Date();
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date, appPreferences: AppPreferences) {
  return startOfWeekByPreference(date, appPreferences);
}

function monthInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function defaultAnchor(cadence: Cadence) {
  const now = new Date();
  return cadence === "monthly" ? monthInputValue(now) : dateKey(now);
}

function periodRange(
  cadence: Cadence,
  anchor: string,
  appPreferences: AppPreferences,
): PeriodRange {
  if (cadence === "monthly") {
    const [year, month] = anchor.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const label = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(start);
    return {
      anchor,
      end: dateKey(end),
      label,
      period: anchor,
      start: dateKey(start),
    };
  }

  if (cadence === "weekly") {
    const start = startOfWeek(parseDate(anchor), appPreferences);
    const end = addDays(start, 6);
    const startKey = dateKey(start);
    const endKey = dateKey(end);
    return {
      anchor: startKey,
      end: endKey,
      label: formatDateRangeValue(startKey, endKey, appPreferences),
      period: `${startKey} -> ${endKey}`,
      start: startKey,
    };
  }

  return {
    anchor,
    end: anchor,
    label: formatDateValue(anchor, appPreferences),
    period: anchor,
    start: anchor,
  };
}

function inferAnchor(cadence: Cadence, period: string) {
  if (cadence === "weekly")
    return period.split(" -> ")[0] || defaultAnchor(cadence);
  return period || defaultAnchor(cadence);
}

function fmtPnl(
  value: number | null,
  currency: string,
  appPreferences: AppPreferences,
) {
  if (value === null) return "-";
  return formatCurrencyValue(value, currency, appPreferences, { signed: true });
}

function fmtPercent(value: number | null, appPreferences: AppPreferences) {
  return formatPercentValue(value, appPreferences);
}

function fmtR(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}R`;
}

function pnlTone(value: number | null) {
  if (value === null) return "";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "flat";
}

function resultShortLabel(result: Trade["exit"]["result"]) {
  switch (result) {
    case "win":
      return "Win";
    case "loss":
      return "Loss";
    case "break-even":
      return "BE";
    default:
      return "-";
  }
}

function resultClass(result: Trade["exit"]["result"]) {
  return result ? `result-${result}` : "result-pending";
}

function directionLabel(direction: Trade["direction"]) {
  return direction === "long" ? "Long" : "Short";
}

function planFollowedLabel(value: NonNullable<Trade["recap"]>["followedPlan"]) {
  switch (value) {
    case "yes":
      return "Yes";
    case "partial":
      return "Partial";
    case "no":
      return "No";
    default:
      return "-";
  }
}

function tradeTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "--:--";
}

function formatTradeTime(trade: Trade, appPreferences: AppPreferences) {
  return formatTimeForDateValue(trade.date, tradeTime(trade), appPreferences);
}

function plannedRiskReward(trade: Trade) {
  const { price, stopLoss, takeProfit } = trade.entry;
  if (price === null || stopLoss === null || takeProfit === null) return null;
  const risk = Math.abs(price - stopLoss);
  if (risk <= 0) return null;
  return Math.abs(takeProfit - price) / risk;
}

function actualRiskReward(trade: Trade) {
  const { price, stopLoss } = trade.entry;
  const exitPrice = trade.exit.price;
  if (price === null || stopLoss === null || exitPrice === null) return null;
  const risk = Math.abs(price - stopLoss);
  if (risk <= 0) return null;
  const move =
    trade.direction === "long" ? exitPrice - price : price - exitPrice;
  return move / risk;
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-"
  );
}

function periodTrades(trades: Trade[], range: PeriodRange) {
  return trades
    .filter((trade) => trade.date >= range.start && trade.date <= range.end)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return tradeTime(a).localeCompare(tradeTime(b));
    });
}

function tradeTagCounts(
  trades: Trade[],
  key: "mistakeTags" | "positiveTags",
): TagCount[] {
  const counts = new Map<string, number>();
  for (const trade of trades) {
    for (const tag of trade.recap?.[key] ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function tagCountText(tag: TagCount) {
  return tag.count > 1 ? `${tag.label} x${tag.count}` : tag.label;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function gradeScore(grade: string): number | null {
  switch (grade) {
    case "A":
      return 4;
    case "B":
      return 3;
    case "C":
      return 2;
    case "D":
      return 1;
    default:
      return null;
  }
}

function gradeLabel(score: number | null) {
  if (score === null) return "-";
  if (score >= 3.5) return "A";
  if (score >= 2.5) return "B";
  if (score >= 1.5) return "C";
  return "D";
}

function recapStats(
  account: TradingAccount | null,
  trades: Trade[],
  range: PeriodRange,
): RecapStats {
  const tradesInPeriod = periodTrades(trades, range);
  const closedTrades = tradesInPeriod.filter((trade) => trade.exit.result);
  const wins = closedTrades.filter(
    (trade) => trade.exit.result === "win",
  ).length;
  const losses = closedTrades.filter(
    (trade) => trade.exit.result === "loss",
  ).length;
  const breakEven = closedTrades.filter(
    (trade) => trade.exit.result === "break-even",
  ).length;
  const hasPnl = tradesInPeriod.some((trade) => trade.pnl !== null);
  const netPnl = hasPnl
    ? tradesInPeriod.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
    : null;
  const olderPnl = trades
    .filter((trade) => trade.date < range.start)
    .reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const balanceBefore = account ? account.startingBalance + olderPnl : null;
  const growthPercent =
    netPnl === null || balanceBefore === null || balanceBefore === 0
      ? null
      : (netPnl / balanceBefore) * 100;
  const withPnl = tradesInPeriod.filter((trade) => trade.pnl !== null);
  const bestTrade = withPnl.reduce<Trade | null>(
    (best, trade) =>
      best === null || (trade.pnl ?? 0) > (best.pnl ?? 0) ? trade : best,
    null,
  );
  const worstTrade = withPnl.reduce<Trade | null>(
    (worst, trade) =>
      worst === null || (trade.pnl ?? 0) < (worst.pnl ?? 0) ? trade : worst,
    null,
  );
  const strategyPnl = new Map<string, number>();
  for (const trade of tradesInPeriod) {
    const strategy = trade.preTrade.strategy || "No strategy";
    strategyPnl.set(
      strategy,
      (strategyPnl.get(strategy) ?? 0) + (trade.pnl ?? 0),
    );
  }
  const bestStrategy =
    Array.from(strategyPnl.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "-";
  const recapRows = tradesInPeriod
    .map((trade) => trade.recap)
    .filter((recap): recap is NonNullable<Trade["recap"]> => recap !== null);
  const gradeAverage = average(
    recapRows
      .map((recap) => gradeScore(recap.grade))
      .filter((score): score is number => score !== null),
  );
  const qualityAverage = average(
    recapRows.flatMap((recap) =>
      [
        recap.setupQuality,
        recap.entryQuality,
        recap.managementQuality,
        recap.exitQuality,
      ].filter((value): value is number => value !== null),
    ),
  );

  return {
    averageActualRr: average(
      tradesInPeriod
        .map(actualRiskReward)
        .filter((value): value is number => value !== null),
    ),
    averageGrade: gradeLabel(gradeAverage),
    averageQuality: qualityAverage,
    bestStrategy,
    bestTrade,
    breakEven,
    closed: closedTrades.length,
    commonEmotion: mostCommon(recapRows.map((recap) => recap.emotionTag)),
    commonMistake: mostCommon(recapRows.flatMap((recap) => recap.mistakeTags)),
    commonPositive: mostCommon(
      recapRows.flatMap((recap) => recap.positiveTags),
    ),
    growthPercent,
    losses,
    missingRecaps: tradesInPeriod.filter((trade) => !trade.hasRecap).length,
    netPnl,
    planFollowed: recapRows.filter((recap) => recap.followedPlan === "yes")
      .length,
    planNotFollowed: recapRows.filter((recap) => recap.followedPlan === "no")
      .length,
    planPartial: recapRows.filter((recap) => recap.followedPlan === "partial")
      .length,
    recapped: tradesInPeriod.filter((trade) => trade.hasRecap).length,
    ruleBreaks: recapRows.filter((recap) => recap.ruleBroken).length,
    totalTrades: tradesInPeriod.length,
    winRate:
      closedTrades.length === 0 ? null : (wins / closedTrades.length) * 100,
    wins,
    worstTrade,
  };
}

function defaultTitle(cadence: Cadence, range: PeriodRange) {
  if (cadence === "daily") {
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
    }).format(parseDate(range.start));
    return `${weekday} recap`;
  }

  const label = cadence[0].toUpperCase() + cadence.slice(1);
  return `${label} recap - ${range.label}`;
}

function recapTitleForPeriod(
  cadence: Cadence,
  period: string,
  appPreferences: AppPreferences,
) {
  if (cadence === "daily") {
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
    }).format(parseDate(period));
    return `${weekday} recap`;
  }

  const label = cadence[0].toUpperCase() + cadence.slice(1);
  return `${label} recap - ${formatRecapPeriod(cadence, period, appPreferences)}`;
}

function emptyNotes(fields: ManualRecapField[]) {
  const notes = Object.fromEntries(
    fields.map((field) => [field.key, field.defaultValue ?? ""]),
  );

  return notes;
}

function extractManualNotes(body: string, fields: ManualRecapField[]) {
  const notes = emptyNotes(fields);
  const lines = body.split("\n").map((line) => line.trim());

  for (const field of fields) {
    const prefix = `- ${field.label}:`;
    const matchingLine = lines.find((line) => line.startsWith(prefix));
    if (matchingLine) {
      notes[field.key] = matchingLine.slice(prefix.length).trim();
    }
  }

  return notes;
}

function extractRecapNotes(body: string, cadence: Cadence) {
  const fields = recapFieldsForCadence(cadence);
  const notes = extractManualNotes(body, fields);

  if (cadence !== "daily") {
    const legacyNotes = extractManualNotes(body, LEGACY_PERIOD_RECAP_FIELDS);
    if (!notes.needsAttention && legacyNotes.mistakesMade) {
      notes.needsAttention = legacyNotes.mistakesMade;
    }
    if (!notes.patterns && legacyNotes.wentWell) {
      notes.patterns = legacyNotes.wentWell;
    }
    if (!notes.nextPeriodFocus && legacyNotes.couldImprove) {
      notes.nextPeriodFocus = legacyNotes.couldImprove;
    }
  }

  return notes;
}

function manualLines(
  fields: ManualRecapField[],
  notes: Record<string, string>,
) {
  return fields.map(
    (field) => `- ${field.label}: ${notes[field.key]?.trim() || "-"}`,
  );
}

function tagCountLines(counts: TagCount[]) {
  return counts.length > 0
    ? counts.map((tag) => `- ${tagCountText(tag)}`)
    : ["- None"];
}

function buildBody(
  cadence: Cadence,
  range: PeriodRange,
  stats: RecapStats,
  notes: Record<string, string>,
  currency: string,
  appPreferences: AppPreferences,
  tradesInPeriod: Trade[],
) {
  const mistakeCounts = tradeTagCounts(tradesInPeriod, "mistakeTags");
  const positiveCounts = tradeTagCounts(tradesInPeriod, "positiveTags");
  const bestTrade = stats.bestTrade
    ? `${formatTradeName(stats.bestTrade, tradesInPeriod)} ${stats.bestTrade.pair} ${formatTradeTime(stats.bestTrade, appPreferences)} ${fmtPnl(
        stats.bestTrade.pnl,
        currency,
        appPreferences,
      )}`
    : "-";
  const worstTrade = stats.worstTrade
    ? `${formatTradeName(stats.worstTrade, tradesInPeriod)} ${stats.worstTrade.pair} ${formatTradeTime(stats.worstTrade, appPreferences)} ${fmtPnl(
        stats.worstTrade.pnl,
        currency,
        appPreferences,
      )}`
    : "-";

  const autoSummary = [
    `Period: ${range.label}`,
    "",
    "Auto summary",
    `- Trades: ${stats.totalTrades}`,
    `- Win / Loss / BE: ${stats.wins} / ${stats.losses} / ${stats.breakEven}`,
    `- Win rate: ${fmtPercent(stats.winRate, appPreferences)}`,
    `- Net P&L: ${fmtPnl(stats.netPnl, currency, appPreferences)}`,
    `- Growth: ${fmtPercent(stats.growthPercent, appPreferences)}`,
    `- Average actual RR: ${fmtR(stats.averageActualRr)}`,
    `- Best strategy: ${stats.bestStrategy}`,
    `- Best trade: ${bestTrade}`,
    `- Worst trade: ${worstTrade}`,
    `- Recaps done: ${stats.recapped}/${stats.totalTrades}`,
    `- Average trade grade: ${stats.averageGrade}`,
    `- Average quality: ${
      stats.averageQuality === null
        ? "-"
        : `${stats.averageQuality.toFixed(1)}/10`
    }`,
    "",
    "Auto process",
    `- Plan followed: ${stats.planFollowed} yes / ${stats.planPartial} partial / ${stats.planNotFollowed} no`,
    `- Rule breaks: ${stats.ruleBreaks}`,
    `- Repeated good behavior: ${stats.commonPositive}`,
    `- Common mistake: ${stats.commonMistake}`,
    `- Common emotion: ${stats.commonEmotion}`,
  ];

  return [
    ...autoSummary,
    "",
    "Imported mistakes",
    ...tagCountLines(mistakeCounts),
    "",
    "Imported done well",
    ...tagCountLines(positiveCounts),
    "",
    reviewHeading(cadence),
    ...manualLines(reviewFieldsForCadence(cadence), notes),
    "",
    scoreHeading(cadence),
    ...manualLines(scoreFieldsForCadence(cadence), notes),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function bodyPreview(body: string) {
  const lines = body.split("\n").filter(Boolean);
  return lines.slice(0, 7).join("\n");
}

function formatRecapPeriod(
  cadence: Cadence,
  period: string,
  appPreferences: AppPreferences,
) {
  if (cadence === "weekly") {
    const [start, end] = period.split(" -> ");
    return start && end
      ? formatDateRangeValue(start, end, appPreferences)
      : period;
  }
  if (cadence === "daily") return formatDateValue(period, appPreferences);
  return period;
}

function currentRecapStatus(
  cadence: Cadence,
  currentRecap: JournalRecapRow | null,
  currentStats: RecapStats,
  today = new Date(),
): CurrentRecapStatus {
  if (currentRecap) return { label: "Done", tone: "done" };

  if (cadence === "daily") {
    return currentStats.totalTrades === 0
      ? { label: "No trades", tone: "neutral" }
      : { label: "Missing", tone: "missing" };
  }

  if (cadence === "weekly") {
    const weekday = today.getDay();
    if (weekday >= 1 && weekday <= 5) {
      return { label: "Ongoing", tone: "ongoing" };
    }
    return weekday === 6
      ? { label: "Missing", tone: "missing" }
      : { label: "Missing", tone: "missing-danger" };
  }

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = endOfMonth.getDate() - today.getDate();
  if (daysRemaining >= 2) return { label: "Ongoing", tone: "ongoing" };
  return daysRemaining === 1
    ? { label: "Missing", tone: "missing" }
    : { label: "Missing", tone: "missing-danger" };
}

function sourceRecapStatus(
  recap: JournalRecapRow | null,
  stats: RecapStats,
): CurrentRecapStatus {
  if (recap) return { label: "Done", tone: "done" };
  return stats.totalTrades === 0
    ? { label: "No trades", tone: "neutral" }
    : { label: "Missing", tone: "missing" };
}

function rangesForWeeklySource(range: PeriodRange) {
  const rows: PeriodRange[] = [];
  let cursor = parseDate(range.start);
  const end = parseDate(range.end);

  while (cursor <= end) {
    const key = dateKey(cursor);
    rows.push({
      anchor: key,
      end: key,
      label: key,
      period: key,
      start: key,
    });
    cursor = addDays(cursor, 1);
  }

  return rows;
}

function rangesForMonthlySource(
  range: PeriodRange,
  appPreferences: AppPreferences,
) {
  const rows: PeriodRange[] = [];
  const seen = new Set<string>();
  let cursor = startOfWeek(parseDate(range.start), appPreferences);
  const end = parseDate(range.end);

  while (cursor <= end) {
    const weeklyRange = periodRange("weekly", dateKey(cursor), appPreferences);
    if (!seen.has(weeklyRange.period)) {
      rows.push(weeklyRange);
      seen.add(weeklyRange.period);
    }
    cursor = addDays(cursor, 7);
  }

  return rows;
}

function periodSourceRows({
  account,
  appPreferences,
  cadence,
  journalRecaps,
  range,
  trades,
}: {
  account: TradingAccount | null;
  appPreferences: AppPreferences;
  cadence: Cadence;
  journalRecaps: Record<Cadence, JournalRecapRow[]>;
  range: PeriodRange;
  trades: Trade[];
}): PeriodSourceRow[] {
  if (cadence === "daily") return [];

  const sourceCadence: Cadence = cadence === "weekly" ? "daily" : "weekly";
  const sourceRanges =
    cadence === "weekly"
      ? rangesForWeeklySource(range)
      : rangesForMonthlySource(range, appPreferences);

  return sourceRanges.map((sourceRange, index) => {
    const stats = recapStats(account, trades, sourceRange);
    const recap =
      journalRecaps[sourceCadence].find(
        (item) => item.period === sourceRange.period,
      ) ?? null;
    const label =
      sourceCadence === "daily"
        ? defaultTitle("daily", sourceRange)
        : `Week ${index + 1}`;
    const meta =
      sourceCadence === "daily"
        ? formatDateValue(sourceRange.period, appPreferences)
        : formatRecapPeriod("weekly", sourceRange.period, appPreferences);

    return {
      label,
      meta,
      period: sourceRange.period,
      range: sourceRange,
      recap,
      stats,
      status: sourceRecapStatus(recap, stats),
    };
  });
}

export function RecapsModule({
  appPreferences,
  selectedAccount,
  selectedAccountId,
}: ModuleContext) {
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [allRecaps, setAllRecaps] = useState<
    Record<Cadence, JournalRecapRow[]>
  >({
    daily: [],
    monthly: [],
    weekly: [],
  });
  const [recaps, setRecaps] = useState<JournalRecapRow[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorRecap, setEditorRecap] = useState<JournalRecapRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [dailyRecaps, weeklyRecaps, monthlyRecaps, loadedTrades] =
        await Promise.all([
          listJournalRecaps("daily", selectedAccountId),
          listJournalRecaps("weekly", selectedAccountId),
          listJournalRecaps("monthly", selectedAccountId),
          listTrades(selectedAccountId),
        ]);
      const loadedRecaps = {
        daily: dailyRecaps,
        monthly: monthlyRecaps,
        weekly: weeklyRecaps,
      };
      setAllRecaps(loadedRecaps);
      setRecaps(loadedRecaps[cadence]);
      setTrades(loadedTrades);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEditorOpen(false);
    setEditorRecap(null);
    reload();
  }, [cadence, selectedAccountId]);

  const currentRange = useMemo(
    () => periodRange(cadence, defaultAnchor(cadence), appPreferences),
    [cadence, appPreferences],
  );
  const currentRecap =
    recaps.find((recap) => recap.period === currentRange.period) ?? null;
  const currentStats = useMemo(
    () => recapStats(selectedAccount, trades, currentRange),
    [currentRange, selectedAccount, trades],
  );
  const currency = selectedAccount?.currency ?? "USD";
  const currentStatus = currentRecapStatus(cadence, currentRecap, currentStats);

  function openNewRecap() {
    setEditorRecap(currentRecap);
    setEditorOpen(true);
  }

  function openRecap(recap: JournalRecapRow) {
    setEditorRecap(recap);
    setEditorOpen(true);
  }

  return (
    <div className="recaps">
      <div className="module-toolbar">
        <div className="tab-bar" role="tablist" aria-label="Recap cadence">
          {CADENCES.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={cadence === item.id}
              className={`tab ${cadence === item.id ? "active" : ""}`}
              onClick={() => setCadence(item.id)}
              type="button"
            >
              <span className="tab-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={openNewRecap}
          disabled={loading}
        >
          {currentRecap ? (
            <Edit3 size={16} aria-hidden="true" />
          ) : (
            <Plus size={16} aria-hidden="true" />
          )}
          <span>{currentRecap ? "Edit current" : `New ${cadence} recap`}</span>
        </button>
      </div>

      <section className="recaps-current-list" aria-label="Current recap">
        <div className="list-table-shell">
          <table className="list-table recaps-current-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th>Trades</th>
                <th>Win / Loss / BE</th>
                <th>Net P&amp;L</th>
                <th>Growth</th>
                <th>Trade recaps</th>
              </tr>
            </thead>
            <tbody>
              <tr className="list-table-row">
                <td>
                  <strong>Current {cadence}</strong>
                  <span>{currentRange.label}</span>
                </td>
                <td>
                  <span className={`recaps-status ${currentStatus.tone}`}>
                    {currentStatus.label}
                  </span>
                </td>
                <td>{currentStats.totalTrades}</td>
                <td>
                  {currentStats.wins} / {currentStats.losses} /{" "}
                  {currentStats.breakEven}
                </td>
                <td className={pnlTone(currentStats.netPnl)}>
                  {fmtPnl(currentStats.netPnl, currency, appPreferences)}
                </td>
                <td className={pnlTone(currentStats.growthPercent)}>
                  {fmtPercent(currentStats.growthPercent, appPreferences)}
                </td>
                <td
                  className={
                    currentStats.missingRecaps > 0 ? "negative" : "positive"
                  }
                >
                  {currentStats.recapped}/{currentStats.totalTrades}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="recap-list" aria-label={`${cadence} recaps`}>
        {loading ? (
          <p className="empty-state">Loading recaps...</p>
        ) : recaps.length === 0 ? (
          <p className="empty-state">
            No {cadence} recaps yet - start with "New {cadence} recap".
          </p>
        ) : (
          <div className="list-table-shell">
            <table className="list-table recaps-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Period</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {recaps.map((recap) => (
                  <tr
                    className="list-table-row list-table-row-clickable"
                    key={recap.id}
                    onDoubleClick={() => openRecap(recap)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openRecap(recap);
                    }}
                    tabIndex={0}
                    title="Double-click to open recap"
                  >
                    <td>
                      <strong>
                        {recapTitleForPeriod(
                          cadence,
                          recap.period,
                          appPreferences,
                        )}
                      </strong>
                    </td>
                    <td>
                      {formatRecapPeriod(cadence, recap.period, appPreferences)}
                    </td>
                    <td>{bodyPreview(recap.body)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorOpen ? (
        <RecapDialog
          account={selectedAccount}
          cadence={cadence}
          appPreferences={appPreferences}
          initialRecap={editorRecap}
          journalRecaps={allRecaps}
          trades={trades}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            setEditorOpen(false);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

function RecapStatsGrid({
  appPreferences,
  currency,
  stats,
}: {
  appPreferences: AppPreferences;
  currency: string;
  stats: RecapStats;
}) {
  return (
    <div className="recaps-stats-grid">
      <StatTile label="Trades" value={stats.totalTrades} />
      <StatTile
        label="Win / Loss / BE"
        value={`${stats.wins} / ${stats.losses} / ${stats.breakEven}`}
      />
      <StatTile
        label="Win rate"
        value={fmtPercent(stats.winRate, appPreferences)}
      />
      <StatTile
        label="Net P&L"
        value={fmtPnl(stats.netPnl, currency, appPreferences)}
        tone={pnlTone(stats.netPnl)}
      />
      <StatTile
        label="Growth"
        value={fmtPercent(stats.growthPercent, appPreferences)}
        tone={pnlTone(stats.growthPercent)}
      />
      <StatTile label="Avg RR" value={fmtR(stats.averageActualRr)} />
      <StatTile label="Best strategy" value={stats.bestStrategy} />
      <StatTile label="Common mistake" value={stats.commonMistake} />
      <StatTile label="Common emotion" value={stats.commonEmotion} />
      <StatTile
        label="Trade recaps"
        value={`${stats.recapped}/${stats.totalTrades}`}
        tone={stats.missingRecaps > 0 ? "negative" : "positive"}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="recaps-stat-tile">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function RecapPeriodRow({
  anchor,
  cadence,
  onAnchorChange,
  title,
}: {
  anchor: string;
  cadence: Cadence;
  onAnchorChange: (value: string) => void;
  title: string;
}) {
  return (
    <div className="recaps-period-row">
      <label className="field">
        <span>{cadence === "monthly" ? "Month" : "Period date"}</span>
        <input
          type={cadence === "monthly" ? "month" : "date"}
          value={anchor}
          onChange={(event) => onAnchorChange(event.target.value)}
        />
      </label>
      <div className="recaps-auto-title">
        <strong>{title}</strong>
      </div>
    </div>
  );
}

function PeriodRecapWorkspace({
  appPreferences,
  cadence,
  currency,
  mistakeCounts,
  notes,
  onNoteChange,
  positiveCounts,
  sourceRows,
  trades,
}: {
  appPreferences: AppPreferences;
  cadence: Cadence;
  currency: string;
  mistakeCounts: TagCount[];
  notes: Record<string, string>;
  onNoteChange: (key: string, value: string) => void;
  positiveCounts: TagCount[];
  sourceRows: PeriodSourceRow[];
  trades: Trade[];
}) {
  const reviewFields = reviewFieldsForCadence(cadence);
  const scoreFields = scoreFieldsForCadence(cadence);

  return (
    <div className="period-recap-workspace">
      {cadence === "daily" ? (
        <DailyTradeRecapList
          appPreferences={appPreferences}
          currency={currency}
          trades={trades}
        />
      ) : (
        <PeriodSourceList
          appPreferences={appPreferences}
          cadence={cadence}
          currency={currency}
          rows={sourceRows}
        />
      )}

      <div className="period-recap-editor-pane">
        <div className="daily-import-grid">
          <DailyTagCountSection
            counts={mistakeCounts}
            emptyLabel="No mistakes imported yet."
            title="Imported mistakes"
          />
          <DailyTagCountSection
            counts={positiveCounts}
            emptyLabel="Nothing imported yet."
            title="Imported done well"
          />
        </div>

        <section
          className="daily-review-fields"
          aria-label={reviewHeading(cadence)}
        >
          {reviewFields.map((field) => (
            <label className="field daily-review-field" key={field.key}>
              <span>{field.label}</span>
              <textarea
                rows={field.rows ?? 3}
                placeholder={field.placeholder}
                value={notes[field.key] ?? ""}
                onChange={(event) =>
                  onNoteChange(field.key, event.target.value)
                }
              />
            </label>
          ))}
        </section>

        <section
          className="daily-score-fields"
          aria-label={scoreHeading(cadence)}
        >
          {scoreFields.map((field) => (
            <DailyScoreField
              field={field}
              key={field.key}
              value={notes[field.key] ?? field.defaultValue ?? "5"}
              onChange={(value) => onNoteChange(field.key, value)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function PeriodSourceList({
  appPreferences,
  cadence,
  currency,
  rows,
}: {
  appPreferences: AppPreferences;
  cadence: Cadence;
  currency: string;
  rows: PeriodSourceRow[];
}) {
  const done = rows.filter((row) => row.recap).length;
  const title = cadence === "weekly" ? "Daily recaps" : "Weekly recaps";

  return (
    <aside className="period-source-pane" aria-label={title}>
      <header className="daily-pane-header">
        <span>{title}</span>
        <strong>
          {done}/{rows.length}
        </strong>
      </header>

      {rows.length === 0 ? (
        <p className="daily-recap-empty">Nothing to summarize yet.</p>
      ) : (
        <div className="period-source-list">
          {rows.map((row) => (
            <PeriodSourceRowItem
              appPreferences={appPreferences}
              currency={currency}
              key={row.period}
              row={row}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function PeriodSourceRowItem({
  appPreferences,
  currency,
  row,
}: {
  appPreferences: AppPreferences;
  currency: string;
  row: PeriodSourceRow;
}) {
  return (
    <details
      className={`period-source-row${row.recap ? "" : " is-missing"}`}
      aria-label={row.label}
    >
      <summary className="period-source-summary">
        <span className="period-source-identity">
          <span>{row.meta}</span>
          <strong>{row.label}</strong>
        </span>
        <span className={`recaps-status ${row.status.tone}`}>
          {row.status.label}
        </span>
      </summary>

      <div className="period-source-details">
        <div className="daily-trade-detail-grid">
          <span>
            Trades
            <strong>{row.stats.totalTrades}</strong>
          </span>
          <span>
            Win / Loss / BE
            <strong>
              {row.stats.wins} / {row.stats.losses} / {row.stats.breakEven}
            </strong>
          </span>
          <span>
            Net P&L
            <strong className={pnlTone(row.stats.netPnl)}>
              {fmtPnl(row.stats.netPnl, currency, appPreferences)}
            </strong>
          </span>
          <span>
            Growth
            <strong className={pnlTone(row.stats.growthPercent)}>
              {fmtPercent(row.stats.growthPercent, appPreferences)}
            </strong>
          </span>
          <span>
            Trade recaps
            <strong>
              {row.stats.recapped}/{row.stats.totalTrades}
            </strong>
          </span>
          <span>
            Best strategy
            <strong>{row.stats.bestStrategy}</strong>
          </span>
        </div>

        {row.recap ? (
          <div className="daily-trade-note">
            <span>Summary</span>
            <p>{bodyPreview(row.recap.body) || "No summary written."}</p>
          </div>
        ) : (
          <p>
            {row.stats.totalTrades === 0
              ? "No trades in this period."
              : "No recap saved yet."}
          </p>
        )}
      </div>
    </details>
  );
}

function DailyTradeRecapList({
  appPreferences,
  currency,
  trades,
}: {
  appPreferences: AppPreferences;
  currency: string;
  trades: Trade[];
}) {
  const recapped = trades.filter((trade) => trade.hasRecap).length;

  return (
    <aside className="daily-trade-recap-pane" aria-label="Trade recaps">
      <header className="daily-pane-header">
        <span>Trade recaps</span>
        <strong>
          {recapped}/{trades.length}
        </strong>
      </header>

      {trades.length === 0 ? (
        <p className="daily-recap-empty">No trades for this day.</p>
      ) : (
        <div className="daily-trade-recap-list">
          {trades.map((trade) => (
            <DailyTradeRecapRow
              appPreferences={appPreferences}
              currency={currency}
              key={trade.id}
              trade={trade}
              tradeName={formatTradeName(trade, trades)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function DailyTradeRecapRow({
  appPreferences,
  currency,
  trade,
  tradeName,
}: {
  appPreferences: AppPreferences;
  currency: string;
  trade: Trade;
  tradeName: string;
}) {
  const recap = trade.recap;

  return (
    <details
      className={`daily-trade-recap-row${recap ? "" : " is-missing"}`}
      aria-label={`${tradeName} trade recap`}
    >
      <summary className="daily-trade-recap-summary">
        <span className="daily-trade-recap-identity">
          <span>{formatTradeTime(trade, appPreferences)}</span>
          <strong>{tradeName}</strong>
        </span>
        <span className={`result-pill ${resultClass(trade.exit.result)}`}>
          {resultShortLabel(trade.exit.result)}
        </span>
      </summary>

      <div className="daily-trade-recap-details">
        <div className="daily-trade-detail-grid">
          <span>
            Instrument
            <strong>{trade.pair || "-"}</strong>
          </span>
          <span>
            Direction
            <strong>{directionLabel(trade.direction)}</strong>
          </span>
          <span>
            Result
            <strong>{resultShortLabel(trade.exit.result)}</strong>
          </span>
          <span>
            P&L
            <strong className={pnlTone(trade.pnl)}>
              {fmtPnl(trade.pnl, currency, appPreferences)}
            </strong>
          </span>
          <span>
            Recap
            <strong>{recap ? recap.grade || "Done" : "Missing"}</strong>
          </span>
          <span>
            Plan
            <strong>
              {recap ? planFollowedLabel(recap.followedPlan) : "-"}
            </strong>
          </span>
        </div>

        {recap ? (
          <>
            <DailyTradeTags
              emptyLabel="No mistakes"
              label="Mistakes"
              tags={recap.mistakeTags}
            />
            <DailyTradeTags
              emptyLabel="Nothing marked"
              label="Done well"
              tags={recap.positiveTags}
            />
            <div className="daily-trade-note">
              <span>Lesson</span>
              <p>{recap.lesson || "No lesson written."}</p>
            </div>
            <div className="daily-trade-note">
              <span>Next time</span>
              <p>{recap.nextAction || "No next action written."}</p>
            </div>
          </>
        ) : (
          <p>Create the trade recap first to import its notes here.</p>
        )}
      </div>
    </details>
  );
}

function DailyTradeTags({
  emptyLabel,
  label,
  tags,
}: {
  emptyLabel: string;
  label: string;
  tags: string[];
}) {
  return (
    <div className="daily-trade-tags">
      <span>{label}</span>
      <div>
        {tags.length > 0 ? (
          tags.map((tag) => <b key={tag}>{tag}</b>)
        ) : (
          <em>{emptyLabel}</em>
        )}
      </div>
    </div>
  );
}

function DailyTagCountSection({
  counts,
  emptyLabel,
  title,
}: {
  counts: TagCount[];
  emptyLabel: string;
  title: string;
}) {
  return (
    <section className="daily-import-section">
      <header>
        <span>{title}</span>
        <strong>{counts.reduce((sum, item) => sum + item.count, 0)}</strong>
      </header>
      {counts.length > 0 ? (
        <div className="daily-import-tags">
          {counts.map((item) => (
            <span key={item.label}>
              {item.label}
              {item.count > 1 ? <b>x{item.count}</b> : null}
            </span>
          ))}
        </div>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </section>
  );
}

function DailyScoreField({
  field,
  onChange,
  value,
}: {
  field: ManualRecapField;
  onChange: (value: string) => void;
  value: string;
}) {
  const parsed = Number(value);
  const score = Number.isFinite(parsed) ? parsed : 5;

  return (
    <label className="daily-score-field">
      <span>
        {field.label}
        <strong>{score}/10</strong>
      </span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={score}
        onChange={(event) => onChange(event.target.value)}
        className="feeling-slider"
      />
      <div className="feeling-bar feeling-bar-large" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={`feeling-cell ${index < score ? "filled" : ""}`}
          />
        ))}
      </div>
    </label>
  );
}

function RecapDialog({
  account,
  cadence,
  appPreferences,
  initialRecap,
  journalRecaps,
  trades,
  onClose,
  onSaved,
}: {
  account: TradingAccount | null;
  cadence: Cadence;
  appPreferences: AppPreferences;
  initialRecap: JournalRecapRow | null;
  journalRecaps: Record<Cadence, JournalRecapRow[]>;
  trades: Trade[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [anchor, setAnchor] = useState(() =>
    initialRecap
      ? inferAnchor(cadence, initialRecap.period)
      : defaultAnchor(cadence),
  );
  const range = periodRange(cadence, anchor, appPreferences);
  const stats = useMemo(
    () => recapStats(account, trades, range),
    [account, range, trades],
  );
  const tradesInPeriod = useMemo(
    () => periodTrades(trades, range),
    [range, trades],
  );
  const mistakeCounts = useMemo(
    () => tradeTagCounts(tradesInPeriod, "mistakeTags"),
    [tradesInPeriod],
  );
  const positiveCounts = useMemo(
    () => tradeTagCounts(tradesInPeriod, "positiveTags"),
    [tradesInPeriod],
  );
  const recapFields = recapFieldsForCadence(cadence);
  const sourceRows = useMemo(
    () =>
      periodSourceRows({
        account,
        appPreferences,
        cadence,
        journalRecaps,
        range,
        trades,
      }),
    [account, appPreferences, cadence, journalRecaps, range, trades],
  );
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    return initialRecap
      ? extractRecapNotes(initialRecap.body, cadence)
      : emptyNotes(recapFields);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = account?.currency ?? "USD";
  const title = defaultTitle(cadence, range);

  function updateNote(key: string, value: string) {
    setNotes((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = buildBody(
        cadence,
        range,
        stats,
        notes,
        currency,
        appPreferences,
        tradesInPeriod,
      );
      const input: JournalRecapInput = {
        id: initialRecap?.id,
        accountId: account?.id ?? null,
        cadence,
        title,
        period: range.period,
        body,
      };
      await saveJournalRecap(input);
      await onSaved();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save recap. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel={`${cadence} recap`}
      bodyClassName="recaps-modal-body recaps-split-modal-body"
      modalClassName="recaps-modal recaps-split-modal"
      onClose={onClose}
      onSubmit={handleSubmit}
      subtitle={range.label}
      title={`${initialRecap ? "Edit" : "Create"} ${cadence} recap`}
      headerContent={
        <div className="period-recap-header-summary">
          <RecapPeriodRow
            anchor={anchor}
            cadence={cadence}
            onAnchorChange={setAnchor}
            title={title}
          />
          <RecapStatsGrid
            appPreferences={appPreferences}
            currency={currency}
            stats={stats}
          />
        </div>
      }
      footer={
        <>
          {error ? (
            <p className="modal-save-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save recap"}
          </button>
        </>
      }
    >
      <PeriodRecapWorkspace
        appPreferences={appPreferences}
        cadence={cadence}
        currency={currency}
        mistakeCounts={mistakeCounts}
        notes={notes}
        onNoteChange={updateNote}
        positiveCounts={positiveCounts}
        sourceRows={sourceRows}
        trades={tradesInPeriod}
      />
    </ModalShell>
  );
}
