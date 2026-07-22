import type {
  JournalRecapRow,
  Trade,
  TradingAccount,
} from "../../shared/db/database";
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
import { addDays, dateKey, parseDate } from "../../shared/localDates";

export type Cadence = JournalRecapRow["cadence"];

export type PeriodRange = {
  anchor: string;
  end: string;
  label: string;
  period: string;
  start: string;
};

export type RecapStats = {
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

export type CurrentRecapStatus = {
  label: string;
  tone: "done" | "missing" | "missing-danger" | "neutral" | "ongoing";
};

export type ManualRecapField = {
  defaultValue?: string;
  key: string;
  label: string;
  placeholder?: string;
  rows?: number;
};

export type TagCount = {
  count: number;
  label: string;
};

export type PeriodSourceRow = {
  label: string;
  meta: string;
  period: string;
  range: PeriodRange;
  recap: JournalRecapRow | null;
  stats: RecapStats;
  status: CurrentRecapStatus;
};

export const DAILY_RECAP_FIELDS: ManualRecapField[] = [
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

export const DAILY_SCORE_FIELDS: ManualRecapField[] = [
  { key: "planScore", label: "Plan followed", defaultValue: "5" },
  { key: "riskScore", label: "Risk control", defaultValue: "5" },
  { key: "entryScore", label: "Entry quality", defaultValue: "5" },
  { key: "exitScore", label: "Exit quality", defaultValue: "5" },
  { key: "mindsetScore", label: "Mindset", defaultValue: "5" },
];

export const PERIOD_SCORE_FIELDS: ManualRecapField[] = [
  { key: "planScore", label: "Plan followed", defaultValue: "5" },
  { key: "riskScore", label: "Risk control", defaultValue: "5" },
  { key: "executionScore", label: "Execution quality", defaultValue: "5" },
  { key: "reviewScore", label: "Review quality", defaultValue: "5" },
  { key: "mindsetScore", label: "Mindset", defaultValue: "5" },
];

export const LEGACY_PERIOD_RECAP_FIELDS: ManualRecapField[] = [
  { key: "mistakesMade", label: "Mistakes made" },
  { key: "wentWell", label: "What went well" },
  { key: "couldImprove", label: "What could be done better" },
];

export function periodReviewFields(cadence: Cadence): ManualRecapField[] {
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

export function reviewFieldsForCadence(cadence: Cadence) {
  return cadence === "daily" ? DAILY_RECAP_FIELDS : periodReviewFields(cadence);
}

export function scoreFieldsForCadence(cadence: Cadence) {
  return cadence === "daily" ? DAILY_SCORE_FIELDS : PERIOD_SCORE_FIELDS;
}

export function recapFieldsForCadence(cadence: Cadence) {
  return [
    ...reviewFieldsForCadence(cadence),
    ...scoreFieldsForCadence(cadence),
  ];
}

export function reviewHeading(cadence: Cadence) {
  return `${cadence[0].toUpperCase()}${cadence.slice(1)} review`;
}

export function scoreHeading(cadence: Cadence) {
  return `${cadence[0].toUpperCase()}${cadence.slice(1)} score`;
}

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function startOfWeek(date: Date, appPreferences: AppPreferences) {
  return startOfWeekByPreference(date, appPreferences);
}

export function monthInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function defaultAnchor(cadence: Cadence) {
  const now = new Date();
  return cadence === "monthly" ? monthInputValue(now) : dateKey(now);
}

export function periodRange(
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

export function inferAnchor(cadence: Cadence, period: string) {
  if (cadence === "weekly")
    return period.split(" -> ")[0] || defaultAnchor(cadence);
  return period || defaultAnchor(cadence);
}

export function fmtPnl(
  value: number | null,
  currency: string,
  appPreferences: AppPreferences,
) {
  if (value === null) return "-";
  return formatCurrencyValue(value, currency, appPreferences, { signed: true });
}

export function fmtPercent(
  value: number | null,
  appPreferences: AppPreferences,
) {
  return formatPercentValue(value, appPreferences);
}

export function fmtR(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}R`;
}

export function pnlTone(value: number | null) {
  if (value === null) return "";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "flat";
}

export function resultShortLabel(result: Trade["exit"]["result"]) {
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

export function resultClass(result: Trade["exit"]["result"]) {
  return result ? `result-${result}` : "result-pending";
}

export function directionLabel(direction: Trade["direction"]) {
  return direction === "long" ? "Long" : "Short";
}

export function planFollowedLabel(
  value: NonNullable<Trade["recap"]>["followedPlan"],
) {
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

export function tradeTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "--:--";
}

export function formatTradeTime(trade: Trade, appPreferences: AppPreferences) {
  return formatTimeForDateValue(trade.date, tradeTime(trade), appPreferences);
}

export function plannedRiskReward(trade: Trade) {
  const { price, stopLoss, takeProfit } = trade.entry;
  if (price === null || stopLoss === null || takeProfit === null) return null;
  const risk = Math.abs(price - stopLoss);
  if (risk <= 0) return null;
  return Math.abs(takeProfit - price) / risk;
}

export function actualRiskReward(trade: Trade) {
  const { price, stopLoss } = trade.entry;
  const exitPrice = trade.exit.price;
  if (price === null || stopLoss === null || exitPrice === null) return null;
  const risk = Math.abs(price - stopLoss);
  if (risk <= 0) return null;
  const move =
    trade.direction === "long" ? exitPrice - price : price - exitPrice;
  return move / risk;
}

export function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-"
  );
}

export function periodTrades(trades: Trade[], range: PeriodRange) {
  return trades
    .filter((trade) => trade.date >= range.start && trade.date <= range.end)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return tradeTime(a).localeCompare(tradeTime(b));
    });
}

export function tradeTagCounts(
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

export function tagCountText(tag: TagCount) {
  return tag.count > 1 ? `${tag.label} x${tag.count}` : tag.label;
}

export function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function gradeScore(grade: string): number | null {
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

export function gradeLabel(score: number | null) {
  if (score === null) return "-";
  if (score >= 3.5) return "A";
  if (score >= 2.5) return "B";
  if (score >= 1.5) return "C";
  return "D";
}

export function recapStats(
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

export function defaultTitle(cadence: Cadence, range: PeriodRange) {
  if (cadence === "daily") {
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
    }).format(parseDate(range.start));
    return `${weekday} recap`;
  }

  const label = cadence[0].toUpperCase() + cadence.slice(1);
  return `${label} recap - ${range.label}`;
}

export function recapTitleForPeriod(
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

export function emptyNotes(fields: ManualRecapField[]) {
  const notes = Object.fromEntries(
    fields.map((field) => [field.key, field.defaultValue ?? ""]),
  );

  return notes;
}

export function extractManualNotes(body: string, fields: ManualRecapField[]) {
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

export function extractRecapNotes(body: string, cadence: Cadence) {
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

export function manualLines(
  fields: ManualRecapField[],
  notes: Record<string, string>,
) {
  return fields.map(
    (field) => `- ${field.label}: ${notes[field.key]?.trim() || "-"}`,
  );
}

export function tagCountLines(counts: TagCount[]) {
  return counts.length > 0
    ? counts.map((tag) => `- ${tagCountText(tag)}`)
    : ["- None"];
}

export function buildBody(
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

export function bodyPreview(body: string) {
  const lines = body.split("\n").filter(Boolean);
  return lines.slice(0, 7).join("\n");
}

export function formatRecapPeriod(
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

export function currentRecapStatus(
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

export function sourceRecapStatus(
  recap: JournalRecapRow | null,
  stats: RecapStats,
): CurrentRecapStatus {
  if (recap) return { label: "Done", tone: "done" };
  return stats.totalTrades === 0
    ? { label: "No trades", tone: "neutral" }
    : { label: "Missing", tone: "missing" };
}

export function rangesForWeeklySource(range: PeriodRange) {
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

export function rangesForMonthlySource(
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

export function periodSourceRows({
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
