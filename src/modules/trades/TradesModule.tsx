import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  List as ListIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addScreenshot,
  closeTrade,
  deleteTrade,
  insertTrade,
  listAccountSetup,
  listTrades,
  saveEntry,
  saveRecap,
  type EntryData,
  type ExitData,
  type NewTrade,
  type RiskManagementPlan,
  type Strategy,
  type Trade,
  type TradeRecapInput,
  type TradeResult,
  type TradingAccount,
} from "../../shared/db/database";
import type { ModuleContext } from "../../app/types";
import { PreTradeCard } from "./components/PreTradeCard";
import { PreTradeForm } from "./components/PreTradeForm";
import {
  DraftScreenshotGallery,
  DraftScreenshotImportButton,
  ScreenshotImportButton,
  TradeScreenshotGallery,
  type DraftScreenshot,
} from "./components/ScreenshotTools";
import { deleteScreenshotFile } from "../../shared/db/storage";
import { ModalShell } from "../../components/ModalShell";
import { TRADE_RECAP_QUICK_MISTAKES } from "./tradeRecapMistakes";
import { TRADE_RECAP_QUICK_POSITIVES } from "./tradeRecapPositives";

type TradesView = "calendar" | "list";
type TradeRecapTab = "pattern" | "lesson" | "score";

const TRADE_VIEWS: { id: TradesView; label: string; icon: ReactNode }[] = [
  { id: "calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
  { id: "list", label: "List", icon: <ListIcon size={16} /> },
];

const TRADE_RECAP_TABS: { id: TradeRecapTab; label: string }[] = [
  { id: "pattern", label: "Pattern" },
  { id: "lesson", label: "Lesson" },
  { id: "score", label: "Score" },
];

const TRADE_RECAP_GRADES: TradeRecapInput["grade"][] = ["A", "B", "C", "D"];

const PLAN_FOLLOWED_OPTIONS: {
  value: TradeRecapInput["followedPlan"];
  label: string;
}[] = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
];

const EMOTION_TAGS = [
  "none",
  "fomo",
  "fear",
  "revenge",
  "hesitation",
  "greed",
  "overconfidence",
];

const LESSON_OPTIONS = [
  "Wait for confirmation",
  "Do not chase price",
  "Respect the risk plan",
  "Trade only valid setups",
  "Avoid trading during chop",
  "Check news first",
  "Exit only by plan",
  "Do not move stop wider",
  "Let winners run",
  "Accept the loss",
  "Stay patient",
  "Follow the checklist",
];

const NEXT_TIME_OPTIONS = [
  "Wait for candle close",
  "Confirm higher timeframe",
  "Use planned lot size",
  "Set stop before entry",
  "Take partials at target",
  "Skip messy price action",
  "Stop after daily loss",
  "Journal before entry",
  "Review setup checklist",
  "Trade only session window",
  "Let trade reach plan",
  "Take only A+ setups",
];

function quickTextParts(value: string) {
  return value
    .split(/\s*(?:;|\n)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toggleQuickTextValue(value: string, option: string) {
  const parts = quickTextParts(value);
  const nextParts = parts.includes(option)
    ? parts.filter((part) => part !== option)
    : [...parts, option];

  return nextParts.join("; ");
}

function hasQuickTextValue(value: string, option: string) {
  return quickTextParts(value).includes(option);
}

function resultLabel(result: TradeResult) {
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

function resultShortLabel(result: TradeResult) {
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

function directionActionLabel(direction: Trade["direction"]) {
  return direction === "long" ? "Buy" : "Sell";
}

function fmtMoney(value: number | null, currency = "USD") {
  if (value === null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function fmtPnl(pnl: number | null, currency = "USD") {
  if (pnl === null) return "—";
  if (pnl === 0) return fmtMoney(0, currency);
  const sign = pnl > 0 ? "+" : "-";
  return `${sign} ${fmtMoney(Math.abs(pnl), currency)}`;
}

function fmtPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function fmtPrice(value: number | null) {
  return value === null ? "—" : String(value);
}

function pnlToneClass(pnl: number | null) {
  if (pnl === null) return "";
  if (pnl > 0) return "positive";
  if (pnl < 0) return "negative";
  return "flat";
}

function fmtRMultiple(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}R`;
}

function parseTradeTime(value: string | null): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function tradeDuration(trade: Trade) {
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

function tradeListTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "—";
}

function tradeListDateTime(trade: Trade) {
  return `${trade.date} ${tradeListTime(trade)}`;
}

function parseTradeDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return new Date();
  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    padTimePart(date.getMonth() + 1),
    padTimePart(date.getDate()),
  ].join("-");
}

function firstOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function calendarDays(month: Date) {
  const start = startOfWeek(firstOfMonth(month));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekLabel(start: Date) {
  const end = addDays(start, 6);
  const startLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function tradePnlTotal(trades: Trade[]) {
  const hasPnl = trades.some((trade) => trade.pnl !== null);
  if (!hasPnl) return null;
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
}

function missingRecapCount(trades: Trade[]) {
  return trades.filter((trade) => !trade.hasRecap).length;
}

function plannedRiskReward(trade: Trade): number | null {
  const { price, stopLoss, takeProfit } = trade.entry;
  if (price === null || stopLoss === null || takeProfit === null) return null;

  const risk = Math.abs(price - stopLoss);
  const reward = Math.abs(takeProfit - price);
  if (risk <= 0 || reward < 0) return null;
  return reward / risk;
}

function actualRiskReward(trade: Trade): number | null {
  const { price, stopLoss } = trade.entry;
  const exitPrice = trade.exit.price;
  if (price === null || stopLoss === null || exitPrice === null) return null;

  const risk = Math.abs(price - stopLoss);
  if (risk <= 0) return null;

  const move =
    trade.direction === "long" ? exitPrice - price : price - exitPrice;
  return move / risk;
}

function parseNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function formatFormNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function accountNetPnl(trades: Trade[]) {
  return trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
}

function accountBalance(account: TradingAccount | null, trades: Trade[]) {
  return account ? account.startingBalance + accountNetPnl(trades) : null;
}

function tradeBalanceSummary(
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

function dayBalanceSummary(
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

function formatDayDialogTitle(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseTradeDate(value));
}

function riskPlanMin(plan: RiskManagementPlan | null) {
  return plan?.riskPerTradeMinPercent ?? null;
}

function riskPlanMax(plan: RiskManagementPlan | null) {
  return plan?.riskPerTradeMaxPercent ?? plan?.riskPercent ?? null;
}

function riskPlanRangeLabel(plan: RiskManagementPlan | null) {
  if (!plan) return "No risk plan connected.";
  const min = riskPlanMin(plan);
  const max = riskPlanMax(plan);
  if (min === null && max === null) return `${plan.name}: risk range not set.`;
  if (min === null) return `${plan.name}: up to ${max}% risk.`;
  if (max === null) return `${plan.name}: ${min}%+ risk.`;
  return `${plan.name}: ${min}-${max}% risk.`;
}

function defaultRiskPercent(plan: RiskManagementPlan | null) {
  return riskPlanMin(plan) ?? riskPlanMax(plan);
}

function calculateRiskAmount(balance: number | null, riskPercent: string) {
  const parsed = parseNumber(riskPercent);
  if (balance === null || parsed === null || !Number.isFinite(parsed))
    return "";
  return (balance * (parsed / 100)).toFixed(2);
}

function padTimePart(value: number) {
  return value.toString().padStart(2, "0");
}

function todayInputValue() {
  const now = new Date();
  return [
    now.getFullYear(),
    padTimePart(now.getMonth() + 1),
    padTimePart(now.getDate()),
  ].join("-");
}

function currentTimeInputValue() {
  const now = new Date();
  return `${padTimePart(now.getHours())}:${padTimePart(now.getMinutes())}`;
}

export function TradesModule({
  selectedAccount,
  selectedAccountId,
}: ModuleContext) {
  const [activeView, setActiveView] = useState<TradesView>("calendar");
  const [calendarMonth, setCalendarMonth] = useState(() =>
    firstOfMonth(new Date()),
  );
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>(
    {},
  );
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [riskPlans, setRiskPlans] = useState<RiskManagementPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recapTrade, setRecapTrade] = useState<Trade | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [loadedTrades, accountSetup] = await Promise.all([
        listTrades(selectedAccountId),
        listAccountSetup(),
      ]);
      setTrades(loadedTrades);
      setStrategies(accountSetup.strategies);
      setRiskPlans(accountSetup.riskPlans);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedId(null);
    setRecapTrade(null);
    setCollapsedWeeks({});
    reload();
  }, [selectedAccountId]);

  const selected = useMemo(
    () => trades.find((trade) => trade.id === selectedId) ?? null,
    [trades, selectedId],
  );
  const linkedStrategies = useMemo(() => {
    if (!selectedAccount) return [];
    const linkedIds = new Set(selectedAccount.strategyIds);
    return strategies.filter((strategy) => linkedIds.has(strategy.id));
  }, [selectedAccount, strategies]);
  const selectedRiskPlan = useMemo(
    () =>
      selectedAccount?.riskPlanId
        ? (riskPlans.find((plan) => plan.id === selectedAccount.riskPlanId) ??
          null)
        : null,
    [riskPlans, selectedAccount],
  );
  const selectedAccountBalance = useMemo(
    () => accountBalance(selectedAccount, trades),
    [selectedAccount, trades],
  );

  if (selected) {
    return (
      <TradeDetail
        account={selectedAccount}
        accountTrades={trades}
        trade={selected}
        onBack={() => setSelectedId(null)}
        onChanged={reload}
        onDeleted={async () => {
          setSelectedId(null);
          await reload();
        }}
      />
    );
  }

  return (
    <div className="trades">
      <header className="page-header">
        <div>
          <h2>Trades</h2>
          <p className="page-subtitle">
            {selectedAccount
              ? `Showing trades for ${selectedAccount.name}.`
              : "No account selected. New trades will stay uncategorized."}
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowNewForm(true)}
          disabled={!selectedAccount || loading}
          title={
            selectedAccount
              ? "Create trade"
              : "Select or create an account first"
          }
        >
          <Plus size={16} aria-hidden="true" />
          <span>New trade</span>
        </button>
      </header>

      <div className="tab-bar" role="tablist" aria-label="Trade views">
        {TRADE_VIEWS.map((view) => (
          <button
            key={view.id}
            role="tab"
            aria-selected={activeView === view.id}
            className={`tab ${activeView === view.id ? "active" : ""}`}
            onClick={() => setActiveView(view.id)}
            type="button"
          >
            <span className="tab-icon" aria-hidden="true">
              {view.icon}
            </span>
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel">
          <p className="empty-state">Loading trades...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="panel">
          <p className="empty-state">No trades yet. Start with New trade.</p>
        </div>
      ) : activeView === "calendar" ? (
        <TradesCalendarView
          month={calendarMonth}
          selectedAccount={selectedAccount}
          trades={trades}
          onCreateRecap={setRecapTrade}
          onMonthChange={setCalendarMonth}
          onSelectTrade={setSelectedId}
        />
      ) : (
        <WeeklyTradesList
          collapsedWeeks={collapsedWeeks}
          selectedAccount={selectedAccount}
          trades={trades}
          onCreateRecap={setRecapTrade}
          onSelectTrade={setSelectedId}
          onToggleWeek={(weekKey) =>
            setCollapsedWeeks((current) => ({
              ...current,
              [weekKey]: !(current[weekKey] ?? false),
            }))
          }
        />
      )}

      {recapTrade ? (
        <TradeRecapDialog
          account={selectedAccount}
          trade={recapTrade}
          onClose={() => setRecapTrade(null)}
          onSaved={async () => {
            setRecapTrade(null);
            await reload();
          }}
        />
      ) : null}

      {showNewForm && selectedAccount ? (
        <NewTradeWorkflow
          account={selectedAccount}
          accountBalance={selectedAccountBalance}
          riskPlan={selectedRiskPlan}
          strategies={linkedStrategies}
          onClose={() => setShowNewForm(false)}
          onSaved={async () => {
            setShowNewForm(false);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

type TradesListTableProps = {
  accountTrades: Trade[];
  selectedAccount: TradingAccount | null;
  trades: Trade[];
  onCreateRecap: (trade: Trade) => void;
  onSelectTrade: (tradeId: string) => void;
};

function TradesListTable({
  accountTrades,
  selectedAccount,
  trades,
  onCreateRecap,
  onSelectTrade,
}: TradesListTableProps) {
  return (
    <table className="trades-table">
      <thead>
        <tr>
          <th>Date / Time</th>
          <th>Buy/Sell</th>
          <th>Strategy</th>
          <th>Win/Loss/BE</th>
          <th className="num">P&amp;L</th>
          <th className="num">Growth %</th>
          <th className="recap-column">Recap</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => {
          const balance = tradeBalanceSummary(
            selectedAccount,
            accountTrades,
            trade,
          );
          const pnlTone = pnlToneClass(trade.pnl);
          const growthTone = pnlToneClass(balance.growthPercent);

          return (
            <tr
              key={trade.id}
              className="trades-row"
              onClick={() => onSelectTrade(trade.id)}
            >
              <td>{tradeListDateTime(trade)}</td>
              <td>
                <span className={`dir-pill dir-${trade.direction}`}>
                  {directionActionLabel(trade.direction)}
                </span>
              </td>
              <td className="strategy-cell">
                {trade.preTrade.strategy || "—"}
              </td>
              <td>
                <span
                  className={`result-pill result-${trade.exit.result || "pending"}`}
                >
                  {resultShortLabel(trade.exit.result)}
                </span>
              </td>
              <td className={`num pnl ${pnlTone}`}>
                {fmtPnl(trade.pnl, selectedAccount?.currency)}
              </td>
              <td className={`num pnl ${growthTone}`}>
                {fmtPercent(balance.growthPercent)}
              </td>
              <td className="recap-cell">
                {trade.hasRecap ? (
                  <span className="recap-status recap-status-done">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    <span>Done</span>
                  </span>
                ) : (
                  <button
                    className="recap-action-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCreateRecap(trade);
                    }}
                    title="Create trade recap"
                  >
                    <AlertTriangle size={13} aria-hidden="true" />
                    <span>Create</span>
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type TradesCalendarViewProps = {
  month: Date;
  selectedAccount: TradingAccount | null;
  trades: Trade[];
  onCreateRecap: (trade: Trade) => void;
  onMonthChange: (month: Date) => void;
  onSelectTrade: (tradeId: string) => void;
};

function TradesCalendarView({
  month,
  selectedAccount,
  trades,
  onCreateRecap,
  onMonthChange,
  onSelectTrade,
}: TradesCalendarViewProps) {
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const days = calendarDays(month);
  const today = todayInputValue();
  const tradesByDate = useMemo(() => {
    const grouped = new Map<string, Trade[]>();
    for (const trade of trades) {
      const dayTrades = grouped.get(trade.date) ?? [];
      dayTrades.push(trade);
      grouped.set(trade.date, dayTrades);
    }
    return grouped;
  }, [trades]);
  const openDayTrades = openDayKey ? (tradesByDate.get(openDayKey) ?? []) : [];
  const openDaySummary = openDayKey
    ? dayBalanceSummary(selectedAccount, trades, openDayKey)
    : null;

  function openDay(key: string, dayTrades: Trade[]) {
    if (dayTrades.length === 0) return;
    setOpenDayKey(key);
  }

  return (
    <section className="panel trade-calendar-panel" aria-label="Trade calendar">
      <div className="calendar-toolbar">
        <button
          className="icon-button"
          type="button"
          aria-label="Previous month"
          onClick={() => {
            setOpenDayKey(null);
            onMonthChange(addMonths(month, -1));
          }}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h3>{formatMonthLabel(month)}</h3>
        <button
          className="icon-button"
          type="button"
          aria-label="Next month"
          onClick={() => {
            setOpenDayKey(null);
            onMonthChange(addMonths(month, 1));
          }}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div className="calendar-weekday" key={day}>
            {day}
          </div>
        ))}

        {days.map((day) => {
          const key = dateKey(day);
          const dayTrades = tradesByDate.get(key) ?? [];
          const missingRecaps = missingRecapCount(dayTrades);
          const daySummary = dayBalanceSummary(selectedAccount, trades, key);
          const dayTone =
            daySummary.pnl === null
              ? ""
              : daySummary.pnl > 0
                ? "winning"
                : daySummary.pnl < 0
                  ? "losing"
                  : "flat";

          return (
            <div
              className={`calendar-day ${
                sameMonth(day, month) ? "" : "outside"
              } ${key === today ? "today" : ""} ${
                dayTrades.length > 0 ? "has-trades" : ""
              } ${dayTone}`}
              aria-label={
                dayTrades.length > 0
                  ? `${formatDayDialogTitle(key)}, ${dayTrades.length} trades, ${missingRecaps} missing recaps`
                  : undefined
              }
              key={key}
              onDoubleClick={() => openDay(key, dayTrades)}
              onKeyDown={(event) => {
                if (
                  dayTrades.length > 0 &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  openDay(key, dayTrades);
                }
              }}
              role={dayTrades.length > 0 ? "button" : undefined}
              tabIndex={dayTrades.length > 0 ? 0 : undefined}
            >
              <div className="calendar-day-header">
                <span>{day.getDate()}</span>
                {missingRecaps > 0 ? (
                  <span
                    className="calendar-recap-warning"
                    title={`${missingRecaps} missing ${missingRecaps === 1 ? "recap" : "recaps"}`}
                    aria-label={`${missingRecaps} missing ${missingRecaps === 1 ? "recap" : "recaps"}`}
                  >
                    <AlertTriangle size={13} aria-hidden="true" />
                    {missingRecaps > 1 ? <span>{missingRecaps}</span> : null}
                  </span>
                ) : null}
              </div>
              {dayTrades.length > 0 ? (
                <div className="calendar-day-summary">
                  <span>
                    {dayTrades.length}{" "}
                    {dayTrades.length === 1 ? "trade" : "trades"}
                  </span>
                  <strong className={pnlToneClass(daySummary.pnl)}>
                    {fmtPnl(daySummary.pnl, selectedAccount?.currency)}
                  </strong>
                  <span className={pnlToneClass(daySummary.growthPercent)}>
                    {fmtPercent(daySummary.growthPercent)}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {openDayKey && openDaySummary ? (
        <DayTradesDialog
          accountTrades={trades}
          dayKey={openDayKey}
          daySummary={openDaySummary}
          onClose={() => setOpenDayKey(null)}
          onCreateRecap={onCreateRecap}
          onSelectTrade={onSelectTrade}
          selectedAccount={selectedAccount}
          trades={openDayTrades}
        />
      ) : null}
    </section>
  );
}

type DayTradesDialogProps = {
  accountTrades: Trade[];
  dayKey: string;
  daySummary: ReturnType<typeof dayBalanceSummary>;
  selectedAccount: TradingAccount | null;
  trades: Trade[];
  onClose: () => void;
  onCreateRecap: (trade: Trade) => void;
  onSelectTrade: (tradeId: string) => void;
};

function DayTradesDialog({
  accountTrades,
  dayKey,
  daySummary,
  selectedAccount,
  trades,
  onClose,
  onCreateRecap,
  onSelectTrade,
}: DayTradesDialogProps) {
  return (
    <ModalShell
      ariaLabel={formatDayDialogTitle(dayKey)}
      modalClassName="day-trades-modal"
      onClose={onClose}
      subtitle={`${trades.length} ${trades.length === 1 ? "trade" : "trades"}`}
      title={formatDayDialogTitle(dayKey)}
      footer={
        <button className="secondary-button" type="button" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="day-trades-summary">
        <div>
          <span>P&L</span>
          <strong className={pnlToneClass(daySummary.pnl)}>
            {fmtPnl(daySummary.pnl, selectedAccount?.currency)}
          </strong>
        </div>
        <div>
          <span>Growth</span>
          <strong className={pnlToneClass(daySummary.growthPercent)}>
            {fmtPercent(daySummary.growthPercent)}
          </strong>
        </div>
        <div>
          <span>Trades</span>
          <strong>{trades.length}</strong>
        </div>
      </div>

      <div className="day-trades-table">
        <TradesListTable
          accountTrades={accountTrades}
          selectedAccount={selectedAccount}
          trades={trades}
          onCreateRecap={onCreateRecap}
          onSelectTrade={onSelectTrade}
        />
      </div>
    </ModalShell>
  );
}

type TradeRecapDialogProps = {
  account: TradingAccount | null;
  trade: Trade;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function createDefaultTradeRecap(trade: Trade): TradeRecapInput {
  return (
    trade.recap ?? {
      grade: "",
      followedPlan: "",
      setupQuality: 5,
      entryQuality: 5,
      managementQuality: 5,
      exitQuality: 5,
      mistakeTags: [],
      positiveTags: [],
      emotionTag: "none",
      ruleBroken: false,
      lesson: "",
      nextAction: "",
      body: "",
    }
  );
}

function TradeRecapDialog({
  account,
  trade,
  onClose,
  onSaved,
}: TradeRecapDialogProps) {
  const [activeTab, setActiveTab] = useState<TradeRecapTab>("pattern");
  const [form, setForm] = useState<TradeRecapInput>(() =>
    createDefaultTradeRecap(trade),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = account?.currency ?? "USD";

  function update<K extends keyof TradeRecapInput>(
    key: K,
    value: TradeRecapInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(key: "mistakeTags" | "positiveTags", tag: string) {
    setForm((current) => {
      const currentTags = current[key];
      return {
        ...current,
        [key]: currentTags.includes(tag)
          ? currentTags.filter((item) => item !== tag)
          : [...currentTags, tag],
      };
    });
  }

  function toggleQuickText(key: "lesson" | "nextAction", option: string) {
    setForm((current) => ({
      ...current,
      [key]: toggleQuickTextValue(current[key], option),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.lesson.trim()) {
      setActiveTab("lesson");
      setError("Lesson is required.");
      return;
    }

    if (!form.grade || !form.followedPlan) {
      setActiveTab("score");
      setError("Grade and plan follow are required.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await saveRecap(trade.id, form);
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
      ariaLabel="Create trade recap"
      bodyClassName="recap-form"
      closeLabel="Close recap"
      modalClassName="trade-recap-modal"
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Create recap - ${trade.pair}`}
      subtitle={
        <>
          {trade.date} {tradeListTime(trade)} -{" "}
          {directionActionLabel(trade.direction)}
        </>
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
      <div className="recap-sticky-head">
        <div className="recap-auto-summary">
          <SummaryMetric
            label="Result"
            value={resultShortLabel(trade.exit.result)}
          />
          <SummaryMetric
            label="P&L"
            value={fmtPnl(trade.pnl, currency)}
            tone={pnlToneClass(trade.pnl)}
          />
          <SummaryMetric
            label="Planned RR"
            value={fmtRMultiple(plannedRiskReward(trade))}
          />
          <SummaryMetric
            label="Actual RR"
            value={fmtRMultiple(actualRiskReward(trade))}
            tone={pnlToneClass(trade.pnl)}
          />
          <SummaryMetric
            label="Before"
            value={
              trade.preTrade.feeling ? `${trade.preTrade.feeling}/10` : "—"
            }
          />
          <SummaryMetric
            label="After"
            value={trade.exit.feeling ? `${trade.exit.feeling}/10` : "—"}
          />
        </div>

        <div
          className="recap-tab-bar"
          role="tablist"
          aria-label="Trade recap sections"
        >
          {TRADE_RECAP_TABS.map((tab) => (
            <button
              className={`recap-tab-button${activeTab === tab.id ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`recap-panel-${tab.id}`}
              id={`recap-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "pattern" ? (
        <section
          className="recap-section"
          role="tabpanel"
          id="recap-panel-pattern"
          aria-labelledby="recap-tab-pattern"
        >
          <h4>Patterns</h4>
          <label className="field">
            <span>Emotional mistake</span>
            <select
              value={form.emotionTag}
              onChange={(event) => update("emotionTag", event.target.value)}
            >
              {EMOTION_TAGS.map((tag) => (
                <option value={tag} key={tag}>
                  {tag === "none" ? "None" : tag}
                </option>
              ))}
            </select>
          </label>
          <RecapTagGroup
            label="Main mistake"
            options={TRADE_RECAP_QUICK_MISTAKES}
            selected={form.mistakeTags}
            onToggle={(tag) => toggleTag("mistakeTags", tag)}
          />
          <RecapTagGroup
            label="What went well"
            options={TRADE_RECAP_QUICK_POSITIVES}
            selected={form.positiveTags}
            onToggle={(tag) => toggleTag("positiveTags", tag)}
          />
        </section>
      ) : null}

      {activeTab === "lesson" ? (
        <section
          className="recap-section"
          role="tabpanel"
          id="recap-panel-lesson"
          aria-labelledby="recap-tab-lesson"
        >
          <h4>Lesson</h4>
          <div className="form-grid">
            <div className="recap-text-block field-wide">
              <label className="field">
                <span>Lesson learned</span>
                <textarea
                  rows={3}
                  value={form.lesson}
                  onChange={(event) => update("lesson", event.target.value)}
                  placeholder="What did this trade teach you?"
                />
              </label>
              <RecapQuickTextGroup
                label="Quick lessons"
                options={LESSON_OPTIONS}
                value={form.lesson}
                onToggle={(option) => toggleQuickText("lesson", option)}
              />
            </div>
            <div className="recap-text-block field-wide">
              <label className="field">
                <span>Next time</span>
                <textarea
                  rows={3}
                  value={form.nextAction}
                  onChange={(event) => update("nextAction", event.target.value)}
                  placeholder="What will you do differently next time?"
                />
              </label>
              <RecapQuickTextGroup
                label="Quick next time"
                options={NEXT_TIME_OPTIONS}
                value={form.nextAction}
                onToggle={(option) => toggleQuickText("nextAction", option)}
              />
            </div>
            <label className="field field-wide">
              <span>Extra notes</span>
              <textarea
                rows={3}
                value={form.body}
                onChange={(event) => update("body", event.target.value)}
                placeholder="Anything else worth remembering"
              />
            </label>
          </div>
        </section>
      ) : null}

      {activeTab === "score" ? (
        <section
          className="recap-section"
          role="tabpanel"
          id="recap-panel-score"
          aria-labelledby="recap-tab-score"
        >
          <h4>Review score</h4>
          <div className="form-grid">
            <label className="field">
              <span>Trade grade</span>
              <select
                value={form.grade}
                onChange={(event) =>
                  update(
                    "grade",
                    event.target.value as TradeRecapInput["grade"],
                  )
                }
              >
                <option value="">Pick grade</option>
                {TRADE_RECAP_GRADES.map((grade) => (
                  <option value={grade} key={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Followed plan?</span>
              <select
                value={form.followedPlan}
                onChange={(event) =>
                  update(
                    "followedPlan",
                    event.target.value as TradeRecapInput["followedPlan"],
                  )
                }
              >
                <option value="">Pick one</option>
                {PLAN_FOLLOWED_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field recap-rule-toggle">
              <span>Rule broken?</span>
              <label>
                <input
                  type="checkbox"
                  checked={form.ruleBroken}
                  onChange={(event) =>
                    update("ruleBroken", event.target.checked)
                  }
                />
                <span>{form.ruleBroken ? "Yes" : "No"}</span>
              </label>
            </label>
          </div>

          <div className="recap-score-grid">
            <RecapScoreField
              label="Setup quality"
              value={form.setupQuality ?? 5}
              onChange={(value) => update("setupQuality", value)}
            />
            <RecapScoreField
              label="Entry quality"
              value={form.entryQuality ?? 5}
              onChange={(value) => update("entryQuality", value)}
            />
            <RecapScoreField
              label="Management quality"
              value={form.managementQuality ?? 5}
              onChange={(value) => update("managementQuality", value)}
            />
            <RecapScoreField
              label="Exit quality"
              value={form.exitQuality ?? 5}
              onChange={(value) => update("exitQuality", value)}
            />
          </div>
        </section>
      ) : null}
    </ModalShell>
  );
}

function RecapQuickTextGroup({
  label,
  options,
  value,
  onToggle,
}: {
  label: string;
  options: string[];
  value: string;
  onToggle: (option: string) => void;
}) {
  return (
    <fieldset className="recap-quick-group">
      <legend>{label}</legend>
      <div className="recap-quick-list">
        {options.map((option) => {
          const selected = hasQuickTextValue(value, option);

          return (
            <button
              className={`recap-quick-option${selected ? " is-selected" : ""}`}
              type="button"
              aria-pressed={selected}
              key={option}
              onClick={() => onToggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RecapScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field recap-score-field">
      <span className="scale-label">
        <span>{label}</span>
        <strong>{value}/10</strong>
      </span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="feeling-slider"
      />
      <ScaleBars value={value} />
    </label>
  );
}

function RecapTagGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <fieldset className="recap-tag-group">
      <legend>{label}</legend>
      <div className="recap-tag-grid">
        {options.map((option) => (
          <label className="recap-tag-option" key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type WeeklyTradesListProps = {
  collapsedWeeks: Record<string, boolean>;
  selectedAccount: TradingAccount | null;
  trades: Trade[];
  onCreateRecap: (trade: Trade) => void;
  onSelectTrade: (tradeId: string) => void;
  onToggleWeek: (weekKey: string) => void;
};

function WeeklyTradesList({
  collapsedWeeks,
  selectedAccount,
  trades,
  onCreateRecap,
  onSelectTrade,
  onToggleWeek,
}: WeeklyTradesListProps) {
  const weekGroups = useMemo(() => {
    const grouped = new Map<string, { start: Date; trades: Trade[] }>();
    for (const trade of trades) {
      const start = startOfWeek(parseTradeDate(trade.date));
      const key = dateKey(start);
      const group = grouped.get(key) ?? { start, trades: [] };
      group.trades.push(trade);
      grouped.set(key, group);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, group]) => ({ key, ...group }));
  }, [trades]);

  return (
    <div className="trade-week-list">
      {weekGroups.map((group) => {
        const isCollapsed = collapsedWeeks[group.key] ?? false;
        const weekPnl = tradePnlTotal(group.trades);
        const missingRecaps = missingRecapCount(group.trades);

        return (
          <section className="trade-week-group" key={group.key}>
            <button
              className="trade-week-header"
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => onToggleWeek(group.key)}
            >
              <span className="trade-week-title">
                {isCollapsed ? (
                  <ChevronRight size={16} aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} aria-hidden="true" />
                )}
                <span>{formatWeekLabel(group.start)}</span>
              </span>
              <span className="trade-week-meta">
                {missingRecaps > 0 ? (
                  <span className="trade-week-recap-warning">
                    <AlertTriangle size={13} aria-hidden="true" />
                    {missingRecaps} missing
                  </span>
                ) : null}
                <span>{group.trades.length} trades</span>
                <strong className={pnlToneClass(weekPnl)}>
                  {fmtPnl(weekPnl, selectedAccount?.currency)}
                </strong>
              </span>
            </button>
            {isCollapsed ? null : (
              <TradesListTable
                accountTrades={trades}
                selectedAccount={selectedAccount}
                trades={group.trades}
                onCreateRecap={onCreateRecap}
                onSelectTrade={onSelectTrade}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

type NewTradeWorkflowProps = {
  account: TradingAccount;
  accountBalance: number | null;
  riskPlan: RiskManagementPlan | null;
  strategies: Strategy[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type NewTradeFormState = {
  date: string;
  pair: string;
  direction: "long" | "short";
  strategy: string;
  riskPercent: string;
  riskAmount: string;
  bias: string;
  setupNotes: string;
  feelingBefore: number;
  entryTime: string;
  entryPrice: string;
  lotSize: string;
  stopLoss: string;
  takeProfit: string;
  entryNotes: string;
  confidence: number;
  exitPrice: string;
  exitTime: string;
  result: TradeResult;
  pnl: string;
  exitNote: string;
  feelingAfter: number;
};

type NewTradeScreenshotStage = "pre-trade" | "entry" | "exit";

type NewTradeScreenshotState = Record<
  NewTradeScreenshotStage,
  DraftScreenshot[]
>;

function createDefaultNewTrade({
  accountBalance,
  riskPlan,
  strategies,
}: {
  accountBalance: number | null;
  riskPlan: RiskManagementPlan | null;
  strategies: Strategy[];
}): NewTradeFormState {
  const riskPercent = formatFormNumber(defaultRiskPercent(riskPlan));
  return {
    date: todayInputValue(),
    pair: "",
    direction: "long",
    strategy: strategies[0]?.name ?? "",
    riskPercent,
    riskAmount: calculateRiskAmount(accountBalance, riskPercent),
    bias: "",
    setupNotes: "",
    feelingBefore: 5,
    entryTime: currentTimeInputValue(),
    entryPrice: "",
    lotSize: "",
    stopLoss: "",
    takeProfit: "",
    entryNotes: "",
    confidence: 5,
    exitPrice: "",
    exitTime: "",
    result: "",
    pnl: "",
    exitNote: "",
    feelingAfter: 5,
  };
}

function createEmptyScreenshotState(): NewTradeScreenshotState {
  return {
    "pre-trade": [],
    entry: [],
    exit: [],
  };
}

function draftScreenshotId() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function NewTradeWorkflow({
  account,
  accountBalance,
  riskPlan,
  strategies,
  onClose,
  onSaved,
}: NewTradeWorkflowProps) {
  const [form, setForm] = useState<NewTradeFormState>(() =>
    createDefaultNewTrade({ accountBalance, riskPlan, strategies }),
  );
  const [screenshots, setScreenshots] = useState<NewTradeScreenshotState>(
    createEmptyScreenshotState,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update<K extends keyof NewTradeFormState>(
    key: K,
    value: NewTradeFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRiskPercent(value: string) {
    setForm((current) => ({
      ...current,
      riskPercent: value,
      riskAmount: calculateRiskAmount(accountBalance, value),
    }));
  }

  function addDraftScreenshot(stage: NewTradeScreenshotStage, path: string) {
    setScreenshots((current) => ({
      ...current,
      [stage]: [
        ...current[stage],
        {
          id: draftScreenshotId(),
          stage,
          path,
          caption: "",
        },
      ],
    }));
  }

  function removeDraftScreenshot(stage: NewTradeScreenshotStage, id: string) {
    setScreenshots((current) => ({
      ...current,
      [stage]: current[stage].filter((screenshot) => screenshot.id !== id),
    }));
  }

  async function discardDraftScreenshots() {
    for (const screenshot of Object.values(screenshots).flat()) {
      try {
        await deleteScreenshotFile(screenshot.path);
      } catch (error) {
        console.error(error);
      }
    }
  }

  async function handleClose() {
    await discardDraftScreenshots();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (strategies.length === 0) {
      setSaveError("Selected account needs at least one linked strategy.");
      return;
    }
    if (!form.pair.trim()) {
      setSaveError("Pair is required.");
      return;
    }
    if (!form.strategy.trim()) {
      setSaveError("Strategy is required.");
      return;
    }
    const riskPercentValue = parseNumber(form.riskPercent);
    if (riskPlan) {
      if (riskPercentValue === null) {
        setSaveError("Risk % is required for this risk plan.");
        return;
      }
      const minRisk = riskPlanMin(riskPlan);
      const maxRisk = riskPlanMax(riskPlan);
      if (minRisk !== null && riskPercentValue < minRisk) {
        setSaveError(`Risk % must be at least ${minRisk}%.`);
        return;
      }
      if (maxRisk !== null && riskPercentValue > maxRisk) {
        setSaveError(`Risk % must be ${maxRisk}% or lower.`);
        return;
      }
    }
    setSaveError(null);

    const hasEntryInput = Boolean(
      form.entryTime ||
      form.entryPrice ||
      form.lotSize ||
      form.stopLoss ||
      form.takeProfit ||
      form.entryNotes.trim(),
    );
    const hasExitInput = Boolean(
      form.exitTime ||
      form.exitPrice ||
      form.result ||
      form.pnl ||
      form.exitNote.trim(),
    );

    const newTrade: NewTrade = {
      accountId: account.id,
      date: form.date,
      pair: form.pair.toUpperCase().trim(),
      direction: form.direction,
      preTrade: {
        strategy: form.strategy.trim(),
        riskPercent: parseNumber(form.riskPercent),
        riskAmount: parseNumber(form.riskAmount),
        bias: form.bias.trim(),
        notes: form.setupNotes.trim(),
        feeling: form.feelingBefore,
      },
      entry: {
        time: form.entryTime || null,
        price: parseNumber(form.entryPrice),
        lotSize: parseNumber(form.lotSize),
        stopLoss: parseNumber(form.stopLoss),
        takeProfit: parseNumber(form.takeProfit),
        notes: form.entryNotes.trim(),
        confidence: hasEntryInput ? form.confidence : null,
      },
      exit: {
        price: parseNumber(form.exitPrice),
        result: form.result,
        note: form.exitNote.trim(),
        feeling: hasExitInput ? form.feelingAfter : null,
        time: form.exitTime || null,
      },
      pnl: parseNumber(form.pnl),
    };

    setSaving(true);
    try {
      const savedTrade = await insertTrade(newTrade);
      for (const screenshot of Object.values(screenshots).flat()) {
        await addScreenshot(
          savedTrade.id,
          screenshot.stage,
          screenshot.path,
          screenshot.caption,
        );
      }
      await onSaved();
    } catch (error) {
      console.error(error);
      setSaveError("Save failed. Restart the app and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel="New trade workflow"
      modalClassName="workflow-modal-card"
      onClose={handleClose}
      onSubmit={handleSubmit}
      subtitle={`${account.name} / ${riskPlanRangeLabel(riskPlan)}`}
      title="New trade"
      footer={
        <>
          {saveError ? (
            <p className="modal-save-error" role="alert">
              {saveError}
            </p>
          ) : null}
          <button
            type="button"
            className="ghost-button"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : "Save trade"}
          </button>
        </>
      }
    >
      <div className="trade-workflow-grid">
        <section className="workflow-card workflow-card-pre">
          <WorkflowCardHeader
            title="Pre-trade"
            subtitle="Plan before the click"
          />
          <div className="stage-field-grid">
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Pair</span>
              <input
                type="text"
                placeholder="EURUSD"
                value={form.pair}
                onChange={(event) => update("pair", event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Strategy</span>
              <select
                value={form.strategy}
                onChange={(event) => update("strategy", event.target.value)}
                disabled={strategies.length === 0}
              >
                {strategies.length === 0 ? (
                  <option value="">No linked strategy</option>
                ) : (
                  strategies.map((strategy) => (
                    <option key={strategy.id} value={strategy.name}>
                      {strategy.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="field">
              <span>Risk %</span>
              <input
                type="number"
                step="any"
                min={riskPlanMin(riskPlan) ?? undefined}
                max={riskPlanMax(riskPlan) ?? undefined}
                value={form.riskPercent}
                onChange={(event) => updateRiskPercent(event.target.value)}
              />
              <small>{riskPlanRangeLabel(riskPlan)}</small>
            </label>
            <label className="field">
              <span>Risk amount</span>
              <input
                type="number"
                step="any"
                value={form.riskAmount}
                readOnly
              />
              <small>
                Balance:{" "}
                {accountBalance === null
                  ? "not available"
                  : `${account.currency} ${accountBalance.toFixed(2)}`}
              </small>
            </label>
            <label className="field field-wide">
              <span>Bias</span>
              <input
                type="text"
                value={form.bias}
                onChange={(event) => update("bias", event.target.value)}
                placeholder="Long from demand / short from supply"
              />
            </label>
            <label className="field field-wide workflow-notes-field">
              <span>Setup notes</span>
              <textarea
                rows={7}
                value={form.setupNotes}
                onChange={(event) => update("setupNotes", event.target.value)}
                placeholder="Why this trade is worth taking"
              />
            </label>
          </div>
          <div className="workflow-card-footer">
            <WorkflowScreenshotSlot
              stage="pre-trade"
              screenshots={screenshots["pre-trade"]}
              onImported={(path) => addDraftScreenshot("pre-trade", path)}
              onDelete={(id) => removeDraftScreenshot("pre-trade", id)}
            />
            <ScaleField
              label="Feeling before trade"
              value={form.feelingBefore}
              onChange={(value) => update("feelingBefore", value)}
            />
          </div>
        </section>

        <section className="workflow-card workflow-card-entry">
          <WorkflowCardHeader title="Entry" subtitle="Execution details" />
          <div className="stage-field-grid">
            <label className="field">
              <span>Entry time</span>
              <input
                type="time"
                value={form.entryTime}
                onChange={(event) => update("entryTime", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Direction</span>
              <select
                value={form.direction}
                onChange={(event) =>
                  update("direction", event.target.value as "long" | "short")
                }
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
            <label className="field">
              <span>Entry price</span>
              <input
                type="number"
                step="any"
                value={form.entryPrice}
                onChange={(event) => update("entryPrice", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Lot size</span>
              <input
                type="number"
                step="any"
                value={form.lotSize}
                onChange={(event) => update("lotSize", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Stop loss</span>
              <input
                type="number"
                step="any"
                value={form.stopLoss}
                onChange={(event) => update("stopLoss", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Take profit</span>
              <input
                type="number"
                step="any"
                value={form.takeProfit}
                onChange={(event) => update("takeProfit", event.target.value)}
              />
            </label>
            <label className="field field-wide workflow-notes-field">
              <span>Entry notes</span>
              <textarea
                rows={7}
                value={form.entryNotes}
                onChange={(event) => update("entryNotes", event.target.value)}
                placeholder="What happened at execution"
              />
            </label>
          </div>
          <div className="workflow-card-footer">
            <WorkflowScreenshotSlot
              stage="entry"
              screenshots={screenshots.entry}
              onImported={(path) => addDraftScreenshot("entry", path)}
              onDelete={(id) => removeDraftScreenshot("entry", id)}
            />
            <ScaleField
              label="Confidence"
              value={form.confidence}
              onChange={(value) => update("confidence", value)}
            />
          </div>
        </section>

        <section className="workflow-card workflow-card-exit">
          <WorkflowCardHeader title="Exit" subtitle="Outcome only" />
          <div className="stage-field-grid">
            <label className="field">
              <span>Exit time</span>
              <input
                type="time"
                value={form.exitTime}
                onChange={(event) => update("exitTime", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Exit price</span>
              <input
                type="number"
                step="any"
                value={form.exitPrice}
                onChange={(event) => update("exitPrice", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Result</span>
              <select
                value={form.result}
                onChange={(event) =>
                  update("result", event.target.value as TradeResult)
                }
              >
                <option value="">Not closed</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="break-even">Break-even</option>
              </select>
            </label>
            <label className="field">
              <span>P&amp;L</span>
              <input
                type="number"
                step="any"
                value={form.pnl}
                onChange={(event) => update("pnl", event.target.value)}
              />
            </label>
            <label className="field field-wide workflow-notes-field">
              <span>Exit note</span>
              <textarea
                rows={8}
                value={form.exitNote}
                onChange={(event) => update("exitNote", event.target.value)}
                placeholder="How the exit happened"
              />
            </label>
          </div>
          <div className="workflow-card-footer">
            <WorkflowScreenshotSlot
              stage="exit"
              screenshots={screenshots.exit}
              onImported={(path) => addDraftScreenshot("exit", path)}
              onDelete={(id) => removeDraftScreenshot("exit", id)}
            />
            <ScaleField
              label="Feeling after trade"
              value={form.feelingAfter}
              onChange={(value) => update("feelingAfter", value)}
            />
          </div>
        </section>
      </div>
    </ModalShell>
  );
}

type WorkflowScreenshotSlotProps = {
  stage: NewTradeScreenshotStage;
  screenshots: DraftScreenshot[];
  onImported: (path: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

function WorkflowScreenshotSlot({
  stage,
  screenshots,
  onImported,
  onDelete,
}: WorkflowScreenshotSlotProps) {
  return (
    <div className="workflow-screenshot-slot">
      <DraftScreenshotImportButton stage={stage} onImported={onImported} />
      {screenshots.length > 0 ? (
        <div className="workflow-screenshot-preview">
          <DraftScreenshotGallery
            screenshots={screenshots}
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </div>
  );
}

type WorkflowCardHeaderProps = {
  title: string;
  subtitle: string;
};

function WorkflowCardHeader({ title, subtitle }: WorkflowCardHeaderProps) {
  return (
    <header className="workflow-card-header">
      <h4>{title}</h4>
      <span>{subtitle}</span>
    </header>
  );
}

type ScaleFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function ScaleField({ label, value, onChange }: ScaleFieldProps) {
  return (
    <label className="field scale-field field-wide">
      <span className="scale-label">
        <span>{label}</span>
        <strong>{value}/10</strong>
      </span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="feeling-slider"
      />
      <ScaleBars value={value} />
    </label>
  );
}

function ScaleBars({ value }: { value: number }) {
  return (
    <div className="feeling-bar feeling-bar-large" aria-hidden="true">
      {Array.from({ length: 10 }).map((_, index) => (
        <span
          key={index}
          className={`feeling-cell ${index < value ? "filled" : ""}`}
        />
      ))}
    </div>
  );
}

type TradeDetailProps = {
  account: TradingAccount | null;
  accountTrades: Trade[];
  trade: Trade;
  onBack: () => void;
  onChanged: () => Promise<void>;
  onDeleted: () => void | Promise<void>;
};

function TradeDetail({
  account,
  accountTrades,
  trade,
  onBack,
  onChanged,
  onDeleted,
}: TradeDetailProps) {
  const [preTradeOpen, setPreTradeOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const plannedRr = plannedRiskReward(trade);
  const actualRr = actualRiskReward(trade);
  const currency = account?.currency ?? "USD";
  const balance = tradeBalanceSummary(account, accountTrades, trade);

  async function handleDeleteTrade() {
    const confirmed = window.confirm(
      "Delete this trade? Notes, screenshots, and recap links will be removed.",
    );
    if (!confirmed) return;

    setDeleteError(null);
    setDeleting(true);
    try {
      await Promise.allSettled(
        trade.screenshots.map((screenshot) =>
          deleteScreenshotFile(screenshot.path),
        ),
      );
      await deleteTrade(trade.id);
      await onDeleted();
    } catch (error) {
      console.error(error);
      setDeleteError("Delete failed. Restart the app and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="trade-detail">
      <header className="trade-detail-header">
        <button
          className="icon-button back-button"
          type="button"
          onClick={onBack}
          aria-label="Back to trades list"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="trade-summary-strip" aria-label="Trade summary">
          <SummaryMetric label="Date" value={trade.date} />
          <SummaryMetric label="Duration" value={tradeDuration(trade)} />
          <SummaryMetric
            label="Balance before"
            value={fmtMoney(balance.before, currency)}
          />
          <SummaryMetric
            label="Balance after"
            value={fmtMoney(balance.after, currency)}
            tone={pnlToneClass(trade.pnl)}
          />
          <SummaryMetric label="Planned RR" value={fmtRMultiple(plannedRr)} />
          <SummaryMetric
            label="Actual RR"
            value={fmtRMultiple(actualRr)}
            tone={pnlToneClass(trade.pnl)}
          />
          <SummaryMetric
            label="Account growth %"
            value={fmtPercent(balance.growthPercent)}
            tone={pnlToneClass(balance.growthPercent)}
          />
        </div>
        <button
          className="ghost-button danger-button trade-delete-button"
          type="button"
          onClick={handleDeleteTrade}
          disabled={deleting}
        >
          <Trash2 size={15} aria-hidden="true" />
          <span>{deleting ? "Deleting..." : "Delete"}</span>
        </button>
      </header>
      {deleteError ? (
        <p className="trade-delete-error" role="alert">
          {deleteError}
        </p>
      ) : null}

      <section className="trade-cards">
        <PreTradeCard
          trade={trade}
          onEdit={() => setPreTradeOpen(true)}
          onChanged={onChanged}
        />
        <EntryCard
          trade={trade}
          onEdit={() => setEntryOpen(true)}
          onChanged={onChanged}
        />
        <ExitCard
          currency={currency}
          trade={trade}
          onEdit={() => setExitOpen(true)}
          onChanged={onChanged}
        />
      </section>

      {preTradeOpen ? (
        <PreTradeForm
          trade={trade}
          onClose={() => setPreTradeOpen(false)}
          onSaved={async () => {
            setPreTradeOpen(false);
            await onChanged();
          }}
        />
      ) : null}
      {entryOpen ? (
        <EntryForm
          trade={trade}
          onClose={() => setEntryOpen(false)}
          onSaved={async () => {
            setEntryOpen(false);
            await onChanged();
          }}
        />
      ) : null}
      {exitOpen ? (
        <ExitForm
          trade={trade}
          onClose={() => setExitOpen(false)}
          onSaved={async () => {
            setExitOpen(false);
            await onChanged();
          }}
        />
      ) : null}
    </div>
  );
}

type SummaryMetricProps = {
  label: string;
  value: ReactNode;
  strong?: boolean;
  tone?: string;
};

function SummaryMetric({
  label,
  value,
  strong,
  tone = "",
}: SummaryMetricProps) {
  return (
    <div className="trade-summary-metric">
      <span>{label}</span>
      <div className={`trade-summary-value ${strong ? "strong" : ""} ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function EntryCard({
  trade,
  onEdit,
  onChanged,
}: {
  trade: Trade;
  onEdit: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const entry = trade.entry;
  const screenshots = trade.screenshots.filter((s) => s.stage === "entry");
  const hasEntry =
    entry.time ||
    entry.notes ||
    entry.price !== null ||
    entry.lotSize !== null ||
    entry.stopLoss !== null ||
    entry.takeProfit !== null ||
    entry.confidence !== null;

  return (
    <article className="trade-card">
      <header className="trade-card-header">
        <span className="stage-dot stage-entry" aria-hidden="true" />
        <h3>Entry</h3>
        <div className="trade-card-actions">
          <ScreenshotImportButton
            tradeId={trade.id}
            stage="entry"
            onChanged={onChanged}
          />
          <button
            className="ghost-button ghost-button-sm"
            type="button"
            onClick={onEdit}
          >
            {hasEntry ? "Edit" : "Fill in"}
          </button>
        </div>
      </header>
      <dl className="trade-card-body">
        <div className="trade-card-fields">
          <div>
            <dt>Entry time</dt>
            <dd>{entry.time ?? "—"}</dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>
              <span className={`dir-pill dir-${trade.direction}`}>
                {trade.direction.toUpperCase()}
              </span>
            </dd>
          </div>
          <div>
            <dt>Entry price</dt>
            <dd>{fmtPrice(entry.price)}</dd>
          </div>
          <div>
            <dt>Lot size</dt>
            <dd>{entry.lotSize ?? "—"}</dd>
          </div>
          <div>
            <dt>Stop loss</dt>
            <dd>{fmtPrice(entry.stopLoss)}</dd>
          </div>
          <div>
            <dt>Take profit</dt>
            <dd>{fmtPrice(entry.takeProfit)}</dd>
          </div>
        </div>
        <div className="trade-card-note">
          <dt>Entry notes</dt>
          <dd>{entry.notes || "No notes yet."}</dd>
        </div>
      </dl>
      <div className="trade-card-bottom">
        <div className="trade-card-screenshots">
          {screenshots.length > 0 ? (
            <TradeScreenshotGallery
              screenshots={screenshots}
              onChanged={onChanged}
            />
          ) : null}
        </div>
        {entry.confidence != null ? (
          <ScaleDisplay label="Confidence" value={entry.confidence} />
        ) : null}
      </div>
    </article>
  );
}

function ExitCard({
  currency,
  trade,
  onEdit,
  onChanged,
}: {
  currency: string;
  trade: Trade;
  onEdit: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const exit = trade.exit;
  const screenshots = trade.screenshots.filter((s) => s.stage === "exit");
  const hasExit =
    exit.note ||
    exit.time ||
    exit.result ||
    exit.price !== null ||
    exit.feeling !== null ||
    trade.pnl !== null;

  return (
    <article className="trade-card">
      <header className="trade-card-header">
        <span className="stage-dot stage-exit" aria-hidden="true" />
        <h3>Exit</h3>
        <div className="trade-card-actions">
          <ScreenshotImportButton
            tradeId={trade.id}
            stage="exit"
            onChanged={onChanged}
          />
          <button
            className="ghost-button ghost-button-sm"
            type="button"
            onClick={onEdit}
          >
            {hasExit ? "Edit" : "Fill in"}
          </button>
        </div>
      </header>
      <dl className="trade-card-body">
        <div className="trade-card-fields">
          <div>
            <dt>Exit time</dt>
            <dd>{exit.time ?? "—"}</dd>
          </div>
          <div>
            <dt>Exit price</dt>
            <dd>{fmtPrice(exit.price)}</dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{resultLabel(exit.result)}</dd>
          </div>
          <div>
            <dt>P&amp;L</dt>
            <dd
              className={
                trade.pnl === null
                  ? ""
                  : trade.pnl > 0
                    ? "positive"
                    : trade.pnl < 0
                      ? "negative"
                      : "flat"
              }
            >
              {fmtPnl(trade.pnl, currency)}
            </dd>
          </div>
        </div>
        <div className="trade-card-note">
          <dt>Exit note</dt>
          <dd>{exit.note || "No notes yet."}</dd>
        </div>
      </dl>
      <div className="trade-card-bottom">
        <div className="trade-card-screenshots">
          {screenshots.length > 0 ? (
            <TradeScreenshotGallery
              screenshots={screenshots}
              onChanged={onChanged}
            />
          ) : null}
        </div>
        {exit.feeling != null ? (
          <ScaleDisplay label="Feeling after trade" value={exit.feeling} />
        ) : null}
      </div>
    </article>
  );
}

function ScaleDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div className="feeling-display">
      <div className="feeling-meta">
        <span className="feeling-label">{label}</span>
        <span className="feeling-value">{value}/10</span>
      </div>
      <ScaleBars value={value} />
    </div>
  );
}

type EntryFormProps = {
  trade: Trade;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function EntryForm({ trade, onClose, onSaved }: EntryFormProps) {
  const [form, setForm] = useState({
    direction: trade.direction,
    time: trade.entry.time ?? currentTimeInputValue(),
    price: trade.entry.price?.toString() ?? "",
    lotSize: trade.entry.lotSize?.toString() ?? "",
    stopLoss: trade.entry.stopLoss?.toString() ?? "",
    takeProfit: trade.entry.takeProfit?.toString() ?? "",
    notes: trade.entry.notes,
    confidence: trade.entry.confidence ?? 5,
  });
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const entry: EntryData = {
      time: form.time || null,
      price: parseNumber(form.price),
      lotSize: parseNumber(form.lotSize),
      stopLoss: parseNumber(form.stopLoss),
      takeProfit: parseNumber(form.takeProfit),
      notes: form.notes.trim(),
      confidence: form.confidence,
    };

    setSaving(true);
    try {
      await saveEntry(trade.id, entry, form.direction);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel="Entry details"
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Entry - ${trade.pair}`}
      footer={
        <>
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : "Save entry"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>Entry time</span>
          <input
            type="time"
            value={form.time}
            onChange={(event) => update("time", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Direction</span>
          <select
            value={form.direction}
            onChange={(event) =>
              update("direction", event.target.value as "long" | "short")
            }
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
        <label className="field">
          <span>Entry price</span>
          <input
            type="number"
            step="any"
            value={form.price}
            onChange={(event) => update("price", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Lot size</span>
          <input
            type="number"
            step="any"
            value={form.lotSize}
            onChange={(event) => update("lotSize", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Stop loss</span>
          <input
            type="number"
            step="any"
            value={form.stopLoss}
            onChange={(event) => update("stopLoss", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Take profit</span>
          <input
            type="number"
            step="any"
            value={form.takeProfit}
            onChange={(event) => update("takeProfit", event.target.value)}
          />
        </label>
        <label className="field field-wide">
          <span>Entry notes</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
          />
        </label>
        <ScaleField
          label="Confidence"
          value={form.confidence}
          onChange={(value) => update("confidence", value)}
        />
      </div>
    </ModalShell>
  );
}

type ExitFormProps = {
  trade: Trade;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function ExitForm({ trade, onClose, onSaved }: ExitFormProps) {
  const [form, setForm] = useState({
    price: trade.exit.price?.toString() ?? "",
    result: trade.exit.result,
    pnl: trade.pnl?.toString() ?? "",
    time: trade.exit.time ?? "",
    note: trade.exit.note,
    feeling: trade.exit.feeling ?? 5,
  });
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const exit: ExitData = {
      price: parseNumber(form.price),
      result: form.result,
      note: form.note.trim(),
      feeling: form.feeling,
      time: form.time || null,
    };

    setSaving(true);
    try {
      await closeTrade(trade.id, exit, parseNumber(form.pnl));
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel="Exit details"
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Exit - ${trade.pair}`}
      footer={
        <>
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving..." : "Save exit"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>Exit time</span>
          <input
            type="time"
            value={form.time}
            onChange={(event) => update("time", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Exit price</span>
          <input
            type="number"
            step="any"
            value={form.price}
            onChange={(event) => update("price", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Result</span>
          <select
            value={form.result}
            onChange={(event) =>
              update("result", event.target.value as TradeResult)
            }
          >
            <option value="">Not closed</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="break-even">Break-even</option>
          </select>
        </label>
        <label className="field">
          <span>P&amp;L</span>
          <input
            type="number"
            step="any"
            value={form.pnl}
            onChange={(event) => update("pnl", event.target.value)}
          />
        </label>
        <label className="field field-wide">
          <span>Exit note</span>
          <textarea
            rows={5}
            value={form.note}
            onChange={(event) => update("note", event.target.value)}
          />
        </label>
        <ScaleField
          label="Feeling after trade"
          value={form.feeling}
          onChange={(value) => update("feeling", value)}
        />
      </div>
    </ModalShell>
  );
}
