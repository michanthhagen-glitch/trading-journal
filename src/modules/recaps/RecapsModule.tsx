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

const CADENCES: { id: Cadence; label: string; icon: ReactNode }[] = [
  { id: "daily", label: "Daily", icon: <CalendarDays size={16} /> },
  { id: "weekly", label: "Weekly", icon: <CalendarRange size={16} /> },
  { id: "monthly", label: "Monthly", icon: <CalendarRange size={16} /> },
];

const MANUAL_RECAP_FIELDS = [
  { key: "mistakesMade", label: "Mistakes made" },
  { key: "wentWell", label: "What went well" },
  { key: "couldImprove", label: "What could be done better" },
];

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
  const periodTrades = trades.filter(
    (trade) => trade.date >= range.start && trade.date <= range.end,
  );
  const closedTrades = periodTrades.filter((trade) => trade.exit.result);
  const wins = closedTrades.filter(
    (trade) => trade.exit.result === "win",
  ).length;
  const losses = closedTrades.filter(
    (trade) => trade.exit.result === "loss",
  ).length;
  const breakEven = closedTrades.filter(
    (trade) => trade.exit.result === "break-even",
  ).length;
  const hasPnl = periodTrades.some((trade) => trade.pnl !== null);
  const netPnl = hasPnl
    ? periodTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0)
    : null;
  const olderPnl = trades
    .filter((trade) => trade.date < range.start)
    .reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const balanceBefore = account ? account.startingBalance + olderPnl : null;
  const growthPercent =
    netPnl === null || balanceBefore === null || balanceBefore === 0
      ? null
      : (netPnl / balanceBefore) * 100;
  const withPnl = periodTrades.filter((trade) => trade.pnl !== null);
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
  for (const trade of periodTrades) {
    const strategy = trade.preTrade.strategy || "No strategy";
    strategyPnl.set(
      strategy,
      (strategyPnl.get(strategy) ?? 0) + (trade.pnl ?? 0),
    );
  }
  const bestStrategy =
    Array.from(strategyPnl.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "-";
  const recapRows = periodTrades
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
      periodTrades
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
    missingRecaps: periodTrades.filter((trade) => !trade.hasRecap).length,
    netPnl,
    planFollowed: recapRows.filter((recap) => recap.followedPlan === "yes")
      .length,
    planNotFollowed: recapRows.filter((recap) => recap.followedPlan === "no")
      .length,
    planPartial: recapRows.filter((recap) => recap.followedPlan === "partial")
      .length,
    recapped: periodTrades.filter((trade) => trade.hasRecap).length,
    ruleBreaks: recapRows.filter((recap) => recap.ruleBroken).length,
    totalTrades: periodTrades.length,
    winRate:
      closedTrades.length === 0 ? null : (wins / closedTrades.length) * 100,
    wins,
    worstTrade,
  };
}

function defaultTitle(cadence: Cadence, range: PeriodRange) {
  const label = cadence[0].toUpperCase() + cadence.slice(1);
  return `${label} recap - ${range.label}`;
}

function extractManualNotes(body: string) {
  const notes = Object.fromEntries(
    MANUAL_RECAP_FIELDS.map((field) => [field.key, ""]),
  );
  const lines = body.split("\n").map((line) => line.trim());

  for (const field of MANUAL_RECAP_FIELDS) {
    const prefix = `- ${field.label}:`;
    const matchingLine = lines.find((line) => line.startsWith(prefix));
    if (matchingLine) {
      notes[field.key] = matchingLine.slice(prefix.length).trim();
    }
  }

  return notes;
}

function buildBody(
  cadence: Cadence,
  range: PeriodRange,
  stats: RecapStats,
  notes: Record<string, string>,
  currency: string,
  appPreferences: AppPreferences,
) {
  const manualLines = MANUAL_RECAP_FIELDS.map(
    (field) => `- ${field.label}: ${notes[field.key]?.trim() || "-"}`,
  );
  const bestTrade = stats.bestTrade
    ? `${stats.bestTrade.pair} ${formatTradeTime(stats.bestTrade, appPreferences)} ${fmtPnl(
        stats.bestTrade.pnl,
        currency,
        appPreferences,
      )}`
    : "-";
  const worstTrade = stats.worstTrade
    ? `${stats.worstTrade.pair} ${formatTradeTime(stats.worstTrade, appPreferences)} ${fmtPnl(
        stats.worstTrade.pnl,
        currency,
        appPreferences,
      )}`
    : "-";

  return [
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
    "",
    "Manual review",
    ...manualLines,
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

export function RecapsModule({
  appPreferences,
  selectedAccount,
  selectedAccountId,
}: ModuleContext) {
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [recaps, setRecaps] = useState<JournalRecapRow[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorRecap, setEditorRecap] = useState<JournalRecapRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [loadedRecaps, loadedTrades] = await Promise.all([
        listJournalRecaps(cadence, selectedAccountId),
        listTrades(selectedAccountId),
      ]);
      setRecaps(loadedRecaps);
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

  function openNewRecap() {
    setEditorRecap(currentRecap);
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
                  <span
                    className={`recaps-status ${
                      currentRecap ? "done" : "missing"
                    }`}
                  >
                    {currentRecap ? "Done" : "Missing"}
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
                  <th className="list-table-action-column">Action</th>
                </tr>
              </thead>
              <tbody>
                {recaps.map((recap) => (
                  <tr className="list-table-row" key={recap.id}>
                    <td>
                      <strong>{recap.title}</strong>
                    </td>
                    <td>
                      {formatRecapPeriod(cadence, recap.period, appPreferences)}
                    </td>
                    <td>{bodyPreview(recap.body)}</td>
                    <td className="list-table-action-cell">
                      <button
                        className="ghost-button ghost-button-sm"
                        type="button"
                        onClick={() => {
                          setEditorRecap(recap);
                          setEditorOpen(true);
                        }}
                      >
                        <Edit3 size={13} aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                    </td>
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

function RecapDialog({
  account,
  cadence,
  appPreferences,
  initialRecap,
  trades,
  onClose,
  onSaved,
}: {
  account: TradingAccount | null;
  cadence: Cadence;
  appPreferences: AppPreferences;
  initialRecap: JournalRecapRow | null;
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
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    return initialRecap
      ? extractManualNotes(initialRecap.body)
      : Object.fromEntries(MANUAL_RECAP_FIELDS.map((field) => [field.key, ""]));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = account?.currency ?? "USD";
  const title =
    initialRecap && initialRecap.period === range.period
      ? initialRecap.title
      : defaultTitle(cadence, range);

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
      bodyClassName="recaps-modal-body"
      modalClassName="recaps-modal"
      onClose={onClose}
      onSubmit={handleSubmit}
      subtitle={range.label}
      title={`${initialRecap ? "Edit" : "Create"} ${cadence} recap`}
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
      <div className="recaps-period-row">
        <label className="field">
          <span>{cadence === "monthly" ? "Month" : "Period date"}</span>
          <input
            type={cadence === "monthly" ? "month" : "date"}
            value={anchor}
            onChange={(event) => {
              setAnchor(event.target.value);
            }}
          />
        </label>
        <div className="recaps-auto-title">
          <span>Auto title</span>
          <strong>{title}</strong>
        </div>
      </div>

      <RecapStatsGrid
        appPreferences={appPreferences}
        stats={stats}
        currency={currency}
      />

      <section className="recaps-manual-fields">
        {MANUAL_RECAP_FIELDS.map((field) => (
          <label className="field recaps-manual-field" key={field.key}>
            <span>{field.label}</span>
            <textarea
              rows={3}
              value={notes[field.key] ?? ""}
              onChange={(event) => updateNote(field.key, event.target.value)}
            />
          </label>
        ))}
      </section>
    </ModalShell>
  );
}
