import {
  AlertTriangle,
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
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  addScreenshot,
  closeTrade,
  deleteTrade,
  insertTrade,
  listAccountSetup,
  listTrades,
  saveEntry,
  savePreTrade,
  saveRecap,
  type Educator,
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
import { BacktestWorkflow } from "./components/BacktestWorkflow";
import {
  DraftScreenshotGallery,
  DraftScreenshotImportButton,
  ReadOnlyTradeScreenshotGallery,
  TradeScreenshotDropZone,
  TradeScreenshotGallery,
  type DraftScreenshot,
} from "./components/ScreenshotTools";
import { deleteScreenshotFile } from "../../shared/db/storage";
import {
  formatCurrencyValue,
  formatDateRangeValue,
  formatDateTimeValue,
  formatDateValue,
  formatPercentValue,
  formatTimeForDateValue,
  formatWeekdayDateValue,
  orderedWeekdayLabels,
  shouldConfirmDelete,
  startOfWeekByPreference,
  type AppPreferences,
} from "../../shared/appPreferences";
import { ModalShell } from "../../components/ModalShell";
import {
  formatTradeName,
  formatTradeNameWithPair,
} from "../../shared/tradeNames";
import { TRADE_RECAP_MISTAKE_GROUPS } from "./tradeRecapMistakes";
import { TRADE_RECAP_POSITIVE_GROUPS } from "./tradeRecapPositives";

type TradesView = "calendar" | "list";
type TradeWorkspaceMode = "trade" | "recap";
type TradeRecapTab = "mistakes" | "done-well" | "lesson" | "score";

const TRADE_VIEWS: { id: TradesView; label: string; icon: ReactNode }[] = [
  { id: "calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
  { id: "list", label: "List", icon: <ListIcon size={16} /> },
];

const TRADE_RECAP_TABS: { id: TradeRecapTab; label: string }[] = [
  { id: "mistakes", label: "Mistakes" },
  { id: "done-well", label: "Done Well" },
  { id: "lesson", label: "Lesson" },
  { id: "score", label: "Score" },
];

function tradeSourceLabel(account: TradingAccount | null) {
  return account?.accountType === "system" ? "Educator" : "Strategy";
}

const TRADE_RECAP_GRADES: TradeRecapInput["grade"][] = ["A", "B", "C", "D"];

const PLAN_FOLLOWED_OPTIONS: {
  value: TradeRecapInput["followedPlan"];
  label: string;
}[] = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
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
  "Size position before entry",
  "No trade is also a decision",
  "Avoid revenge trading",
  "Wait for candle close",
  "Trust higher timeframe bias",
  "Do not enter from boredom",
  "Respect session conditions",
  "Review screenshots before entry",
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
  "Check news calendar",
  "Mark key levels first",
  "Wait for retest",
  "Set alert instead of chasing",
  "Close platform after max loss",
  "Screenshot entry and exit",
  "Move stop only by plan",
  "Pause after emotional trade",
];

const TRADE_RECAP_MISTAKE_CATALOG = TRADE_RECAP_MISTAKE_GROUPS.map((group) => ({
  group: group.group,
  options: group.mistakes,
}));

const TRADE_RECAP_POSITIVE_CATALOG = TRADE_RECAP_POSITIVE_GROUPS.map(
  (group) => ({
    group: group.group,
    options: group.positives,
  }),
);

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
  return direction === "long" ? "Long" : "Short";
}

function fmtMoney(
  value: number | null,
  currency: string,
  appPreferences: AppPreferences,
) {
  return formatCurrencyValue(value, currency, appPreferences);
}

function fmtPnl(
  pnl: number | null,
  currency: string,
  appPreferences: AppPreferences,
) {
  if (pnl === null) return "—";
  return formatCurrencyValue(pnl, currency, appPreferences, { signed: true });
}

function fmtPercent(value: number | null, appPreferences: AppPreferences) {
  return formatPercentValue(value, appPreferences);
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

function tradeListDateTime(trade: Trade, appPreferences: AppPreferences) {
  return formatDateTimeValue(trade.date, tradeListTime(trade), appPreferences);
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

function startOfWeek(date: Date, appPreferences: AppPreferences) {
  return startOfWeekByPreference(date, appPreferences);
}

function calendarDays(month: Date, appPreferences: AppPreferences) {
  const start = startOfWeek(firstOfMonth(month), appPreferences);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekLabel(start: Date, appPreferences: AppPreferences) {
  const end = addDays(start, 6);
  return formatDateRangeValue(start, end, appPreferences);
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

function formatDayDialogTitle(value: string, appPreferences: AppPreferences) {
  return formatWeekdayDateValue(value, appPreferences);
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
  appPreferences,
  onTradesChanged,
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
  const [educators, setEducators] = useState<Educator[]>([]);
  const [riskPlans, setRiskPlans] = useState<RiskManagementPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<{
    mode: TradeWorkspaceMode;
    tradeId: string;
  } | null>(null);
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
      setEducators(accountSetup.educators);
      setRiskPlans(accountSetup.riskPlans);
    } finally {
      setLoading(false);
    }
  }

  async function reloadAfterTradeChange() {
    await reload();
    await onTradesChanged();
  }

  useEffect(() => {
    setWorkspace(null);
    setCollapsedWeeks({});
    reload();
  }, [selectedAccountId]);

  useEffect(() => {
    function handleOpenTrade(event: Event) {
      const detail = (event as CustomEvent<{ tradeId: string }>).detail;
      if (!detail?.tradeId) return;
      setActiveView("list");
      setWorkspace({ tradeId: detail.tradeId, mode: "trade" });
    }
    window.addEventListener("trading-journal:open-trade", handleOpenTrade);
    return () =>
      window.removeEventListener("trading-journal:open-trade", handleOpenTrade);
  }, []);

  const workspaceTrade = useMemo(
    () =>
      workspace
        ? (trades.find((trade) => trade.id === workspace.tradeId) ?? null)
        : null,
    [trades, workspace],
  );
  const workspaceStrategy = useMemo(() => {
    if (!workspaceTrade) return null;
    if (selectedAccount?.accountType === "system") {
      const educator = educators.find(
        (item) => item.name === workspaceTrade.preTrade.strategy,
      );
      return educator?.strategyId
        ? (strategies.find((item) => item.id === educator.strategyId) ?? null)
        : null;
    }
    return (
      strategies.find(
        (item) => item.name === workspaceTrade.preTrade.strategy,
      ) ?? null
    );
  }, [educators, selectedAccount?.accountType, strategies, workspaceTrade]);
  const linkedStrategies = useMemo(() => {
    if (!selectedAccount) return [];
    const linkedIds = new Set(selectedAccount.strategyIds);
    return strategies.filter((strategy) => linkedIds.has(strategy.id));
  }, [selectedAccount, strategies]);
  const linkedEducators = useMemo(() => {
    if (!selectedAccount) return [];
    const linkedIds = new Set(selectedAccount.educatorIds);
    return educators.filter((educator) => linkedIds.has(educator.id));
  }, [educators, selectedAccount]);
  const tradeSources =
    selectedAccount?.accountType === "system"
      ? linkedEducators
      : linkedStrategies;
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

  function openTradeWorkspace(tradeId: string, mode: TradeWorkspaceMode) {
    setWorkspace({ tradeId, mode });
  }

  return (
    <div className="trades">
      <div className="module-toolbar">
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

        <button
          className="primary-button"
          type="button"
          onClick={() => setShowNewForm(true)}
          disabled={!selectedAccount || loading}
          title={
            selectedAccount
              ? selectedAccount.accountType === "backtesting"
                ? "Start backtesting"
                : "Create trade"
              : "Select or create an account first"
          }
        >
          <Plus size={16} aria-hidden="true" />
          <span>
            {selectedAccount?.accountType === "backtesting"
              ? "New backtest"
              : "New trade"}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="panel">
          <p className="empty-state">Loading trades...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="panel">
          <p className="empty-state">
            {selectedAccount?.accountType === "backtesting"
              ? "No backtest trades yet. Start with New backtest."
              : "No trades yet. Start with New trade."}
          </p>
        </div>
      ) : activeView === "calendar" ? (
        <TradesCalendarView
          month={calendarMonth}
          appPreferences={appPreferences}
          selectedAccount={selectedAccount}
          trades={trades}
          onCreateRecap={(trade) => openTradeWorkspace(trade.id, "recap")}
          onMonthChange={setCalendarMonth}
          onSelectTrade={(tradeId) => openTradeWorkspace(tradeId, "trade")}
        />
      ) : (
        <WeeklyTradesList
          collapsedWeeks={collapsedWeeks}
          appPreferences={appPreferences}
          selectedAccount={selectedAccount}
          trades={trades}
          onCreateRecap={(trade) => openTradeWorkspace(trade.id, "recap")}
          onSelectTrade={(tradeId) => openTradeWorkspace(tradeId, "trade")}
          onToggleWeek={(weekKey) =>
            setCollapsedWeeks((current) => ({
              ...current,
              [weekKey]: !(current[weekKey] ?? false),
            }))
          }
        />
      )}

      {workspace && workspaceTrade ? (
        <TradeWorkspaceDialog
          account={selectedAccount}
          accountTrades={trades}
          appPreferences={appPreferences}
          mode={workspace.mode}
          trade={workspaceTrade}
          tradeSources={tradeSources}
          strategyTemplate={workspaceStrategy}
          onChanged={reloadAfterTradeChange}
          onClose={() => setWorkspace(null)}
          onDeleted={async () => {
            setWorkspace(null);
            await reloadAfterTradeChange();
          }}
          onModeChange={(mode) =>
            setWorkspace((current) =>
              current ? { ...current, mode } : current,
            )
          }
        />
      ) : null}

      {showNewForm && selectedAccount ? (
        selectedAccount.accountType === "backtesting" ? (
          <BacktestWorkflow
            account={selectedAccount}
            appPreferences={appPreferences}
            strategies={linkedStrategies}
            onClose={() => setShowNewForm(false)}
            onTradeSaved={reloadAfterTradeChange}
          />
        ) : (
          <NewTradeWorkflow
            account={selectedAccount}
            accountBalance={selectedAccountBalance}
            appPreferences={appPreferences}
            educators={educators}
            riskPlan={selectedRiskPlan}
            sourceLabel={tradeSourceLabel(selectedAccount)}
            strategies={strategies}
            tradeSources={tradeSources}
            onClose={() => setShowNewForm(false)}
            onSaved={async () => {
              setShowNewForm(false);
              await reloadAfterTradeChange();
            }}
          />
        )
      ) : null}
    </div>
  );
}

type TradesListTableProps = {
  accountTrades: Trade[];
  appPreferences: AppPreferences;
  selectedAccount: TradingAccount | null;
  trades: Trade[];
  onCreateRecap: (trade: Trade) => void;
  onSelectTrade: (tradeId: string) => void;
};

function TradesListTable({
  accountTrades,
  appPreferences,
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
          <th>Trade</th>
          <th>Direction</th>
          <th>{tradeSourceLabel(selectedAccount)}</th>
          <th>Win/Loss/BE</th>
          <th className="num">P&amp;L</th>
          <th className="num">Growth %</th>
          {selectedAccount?.accountType === "backtesting" ? null : (
            <th className="recap-column">Recap</th>
          )}
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
              <td>{tradeListDateTime(trade, appPreferences)}</td>
              <td className="trade-name-cell">
                {formatTradeName(trade, accountTrades)}
              </td>
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
                {fmtPnl(
                  trade.pnl,
                  selectedAccount?.currency ?? "USD",
                  appPreferences,
                )}
              </td>
              <td className={`num pnl ${growthTone}`}>
                {fmtPercent(balance.growthPercent, appPreferences)}
              </td>
              {selectedAccount?.accountType === "backtesting" ? null : (
                <td className="recap-cell">
                  {trade.hasRecap ? (
                    <button
                      className="recap-action-button recap-action-done"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateRecap(trade);
                      }}
                      title="Open trade recap"
                    >
                      <CheckCircle2 size={13} aria-hidden="true" />
                      <span>Done</span>
                    </button>
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
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

type TradesCalendarViewProps = {
  appPreferences: AppPreferences;
  month: Date;
  selectedAccount: TradingAccount | null;
  trades: Trade[];
  onCreateRecap: (trade: Trade) => void;
  onMonthChange: (month: Date) => void;
  onSelectTrade: (tradeId: string) => void;
};

function TradesCalendarView({
  appPreferences,
  month,
  selectedAccount,
  trades,
  onCreateRecap,
  onMonthChange,
  onSelectTrade,
}: TradesCalendarViewProps) {
  const [openDayKey, setOpenDayKey] = useState<string | null>(null);
  const days = calendarDays(month, appPreferences);
  const weekdayLabels = orderedWeekdayLabels(appPreferences);
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
        {weekdayLabels.map((day) => (
          <div className="calendar-weekday" key={day}>
            {day}
          </div>
        ))}

        {days.map((day) => {
          const key = dateKey(day);
          const dayTrades = tradesByDate.get(key) ?? [];
          const missingRecaps =
            selectedAccount?.accountType === "backtesting"
              ? 0
              : missingRecapCount(dayTrades);
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
                  ? `${formatDayDialogTitle(key, appPreferences)}, ${dayTrades.length} trades${missingRecaps > 0 ? `, ${missingRecaps} missing recaps` : ""}`
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
                    {fmtPnl(
                      daySummary.pnl,
                      selectedAccount?.currency ?? "USD",
                      appPreferences,
                    )}
                  </strong>
                  <span className={pnlToneClass(daySummary.growthPercent)}>
                    {fmtPercent(daySummary.growthPercent, appPreferences)}
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
          appPreferences={appPreferences}
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
  appPreferences: AppPreferences;
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
  appPreferences,
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
      ariaLabel={formatDayDialogTitle(dayKey, appPreferences)}
      modalClassName="day-trades-modal"
      onClose={onClose}
      subtitle={`${trades.length} ${trades.length === 1 ? "trade" : "trades"}`}
      title={formatDayDialogTitle(dayKey, appPreferences)}
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
            {fmtPnl(
              daySummary.pnl,
              selectedAccount?.currency ?? "USD",
              appPreferences,
            )}
          </strong>
        </div>
        <div>
          <span>Growth</span>
          <strong className={pnlToneClass(daySummary.growthPercent)}>
            {fmtPercent(daySummary.growthPercent, appPreferences)}
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
          appPreferences={appPreferences}
          selectedAccount={selectedAccount}
          trades={trades}
          onCreateRecap={(trade) => {
            onClose();
            onCreateRecap(trade);
          }}
          onSelectTrade={(tradeId) => {
            onClose();
            onSelectTrade(tradeId);
          }}
        />
      </div>
    </ModalShell>
  );
}

type TradeWorkspaceDialogProps = {
  account: TradingAccount | null;
  accountTrades: Trade[];
  appPreferences: AppPreferences;
  mode: TradeWorkspaceMode;
  trade: Trade;
  tradeSources: Array<{ id: string; name: string }>;
  strategyTemplate: Strategy | null;
  onChanged: () => Promise<void>;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
  onModeChange: (mode: TradeWorkspaceMode) => void;
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

function TradeWorkspaceDialog({
  account,
  accountTrades,
  appPreferences,
  mode,
  trade,
  tradeSources,
  strategyTemplate,
  onChanged,
  onClose,
  onDeleted,
  onModeChange,
}: TradeWorkspaceDialogProps) {
  const currency = account?.currency ?? "USD";
  const isRecapMode = mode === "recap";
  const tradeName = formatTradeName(trade, accountTrades);
  const tradeNameWithPair = formatTradeNameWithPair(trade, accountTrades);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [recapActiveTab, setRecapActiveTab] =
    useState<TradeRecapTab>("mistakes");
  const [recapForm, setRecapForm] = useState<TradeRecapInput>(() =>
    createDefaultTradeRecap(trade),
  );
  const [recapSaving, setRecapSaving] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);

  useEffect(() => {
    setRecapActiveTab("mistakes");
    setRecapForm(createDefaultTradeRecap(trade));
    setRecapError(null);
    setRecapSaving(false);
  }, [trade.id]);

  function updateRecap<K extends keyof TradeRecapInput>(
    key: K,
    value: TradeRecapInput[K],
  ) {
    setRecapForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRecapTag(key: "mistakeTags" | "positiveTags", tag: string) {
    setRecapForm((current) => {
      const currentTags = current[key];
      return {
        ...current,
        [key]: currentTags.includes(tag)
          ? currentTags.filter((item) => item !== tag)
          : [...currentTags, tag],
      };
    });
  }

  function toggleRecapQuickText(key: "lesson" | "nextAction", option: string) {
    setRecapForm((current) => ({
      ...current,
      [key]: toggleQuickTextValue(current[key], option),
    }));
  }

  async function handleDeleteTrade() {
    if (
      shouldConfirmDelete(appPreferences) &&
      !window.confirm(
        "Delete this trade? Notes, screenshots, and recap links will be removed.",
      )
    ) {
      return;
    }

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

  async function handleRecapSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!recapForm.lesson.trim()) {
      setRecapActiveTab("lesson");
      setRecapError("Lesson is required.");
      return;
    }

    if (!recapForm.grade || !recapForm.followedPlan) {
      setRecapActiveTab("score");
      setRecapError("Grade and plan follow are required.");
      return;
    }

    setRecapError(null);
    setRecapSaving(true);
    try {
      await saveRecap(trade.id, recapForm);
      await onChanged();
    } catch (saveError) {
      console.error(saveError);
      setRecapError("Could not save recap. Try again.");
    } finally {
      setRecapSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel="Trade workspace"
      bodyClassName="trade-workspace-body"
      closeLabel="Close trade workspace"
      modalClassName={`trade-workspace-modal trade-workspace-modal-${mode}`}
      onClose={onClose}
      title={
        isRecapMode
          ? `${trade.hasRecap ? "Edit recap" : "Create recap"} - ${tradeName}`
          : tradeNameWithPair
      }
      subtitle={
        <>
          {tradeListDateTime(trade, appPreferences)} - {trade.pair} -{" "}
          {directionActionLabel(trade.direction)}
        </>
      }
      headerActions={
        isRecapMode ? null : (
          <button
            className="ghost-button danger-button trade-delete-button"
            type="button"
            onClick={handleDeleteTrade}
            disabled={deleting}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>{deleting ? "Deleting..." : "Delete"}</span>
          </button>
        )
      }
      headerContent={
        isRecapMode ? null : (
          <TradeSummaryStrip
            account={account}
            accountTrades={accountTrades}
            appPreferences={appPreferences}
            trade={trade}
          />
        )
      }
      footer={
        isRecapMode ? (
          <>
            {recapError ? (
              <p className="modal-save-error" role="alert">
                {recapError}
              </p>
            ) : null}
            <button
              className="secondary-button"
              type="button"
              onClick={() => onModeChange("trade")}
              disabled={recapSaving}
            >
              Back to trade
            </button>
            <button
              className="primary-button"
              type="submit"
              form="trade-recap-editor-form"
              disabled={recapSaving}
            >
              {recapSaving
                ? "Saving..."
                : trade.hasRecap
                  ? "Save changes"
                  : "Save recap"}
            </button>
          </>
        ) : (
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      <div className={`trade-workspace trade-workspace-${mode}`}>
        <div className="trade-workspace-primary">
          {isRecapMode ? (
            <TradeRecapContextPanel
              appPreferences={appPreferences}
              currency={currency}
              isSystemAccount={
                account?.accountType === "system" ||
                account?.accountType === "backtesting"
              }
              sourceLabel={tradeSourceLabel(account)}
              trade={trade}
              tradeName={tradeName}
            />
          ) : (
            <TradeDetail
              account={account}
              appPreferences={appPreferences}
              trade={trade}
              tradeName={tradeName}
              tradeSources={tradeSources}
              strategyTemplate={strategyTemplate}
              onChanged={onChanged}
              deleteError={deleteError}
            />
          )}
        </div>

        <div className="trade-workspace-secondary">
          {isRecapMode ? (
            <TradeRecapEditor
              activeTab={recapActiveTab}
              form={recapForm}
              onActiveTabChange={setRecapActiveTab}
              onSubmit={handleRecapSubmit}
              onToggleQuickText={toggleRecapQuickText}
              onToggleTag={toggleRecapTag}
              onUpdate={updateRecap}
            />
          ) : (
            <TradeRecapSummaryPanel
              trade={trade}
              onOpenRecap={() => onModeChange("recap")}
            />
          )}
        </div>
      </div>
    </ModalShell>
  );
}

type TradeRecapEditorProps = {
  activeTab: TradeRecapTab;
  form: TradeRecapInput;
  onActiveTabChange: (tab: TradeRecapTab) => void;
  onSubmit: (event: React.FormEvent) => void | Promise<void>;
  onToggleQuickText: (key: "lesson" | "nextAction", option: string) => void;
  onToggleTag: (key: "mistakeTags" | "positiveTags", tag: string) => void;
  onUpdate: <K extends keyof TradeRecapInput>(
    key: K,
    value: TradeRecapInput[K],
  ) => void;
};

function TradeRecapEditor({
  activeTab,
  form,
  onActiveTabChange,
  onSubmit,
  onToggleQuickText,
  onToggleTag,
  onUpdate,
}: TradeRecapEditorProps) {
  return (
    <form
      className="trade-recap-editor"
      id="trade-recap-editor-form"
      onSubmit={onSubmit}
    >
      <div className="recap-sticky-head">
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
              onClick={() => onActiveTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "mistakes" ? (
        <section
          className="recap-section"
          role="tabpanel"
          id="recap-panel-mistakes"
          aria-labelledby="recap-tab-mistakes"
        >
          <div className="recap-section-title-row">
            <h4>Mistakes</h4>
            <span>{form.mistakeTags.length} selected</span>
          </div>
          <RecapGroupedTagSection
            groups={TRADE_RECAP_MISTAKE_CATALOG}
            emptyLabel="No mistakes selected"
            addLabel="Add mistake"
            selected={form.mistakeTags}
            onToggle={(tag) => onToggleTag("mistakeTags", tag)}
          />
        </section>
      ) : null}

      {activeTab === "done-well" ? (
        <section
          className="recap-section"
          role="tabpanel"
          id="recap-panel-done-well"
          aria-labelledby="recap-tab-done-well"
        >
          <div className="recap-section-title-row">
            <h4>Done well</h4>
            <span>{form.positiveTags.length} selected</span>
          </div>
          <RecapGroupedTagSection
            groups={TRADE_RECAP_POSITIVE_CATALOG}
            emptyLabel="Nothing selected yet"
            addLabel="Add"
            selected={form.positiveTags}
            onToggle={(tag) => onToggleTag("positiveTags", tag)}
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
              <RecapQuickTextArea
                label="Lesson learned"
                quickLabel="Quick lessons"
                options={LESSON_OPTIONS}
                placeholder="What did this trade teach you?"
                value={form.lesson}
                onChange={(value) => onUpdate("lesson", value)}
                onToggle={(option) => onToggleQuickText("lesson", option)}
              />
            </div>
            <div className="recap-text-block field-wide">
              <RecapQuickTextArea
                label="Next time"
                quickLabel="Quick next time"
                options={NEXT_TIME_OPTIONS}
                placeholder="What will you do differently next time?"
                value={form.nextAction}
                onChange={(value) => onUpdate("nextAction", value)}
                onToggle={(option) => onToggleQuickText("nextAction", option)}
              />
            </div>
            <label className="field field-wide">
              <span>Extra notes</span>
              <textarea
                rows={3}
                value={form.body}
                onChange={(event) => onUpdate("body", event.target.value)}
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
                  onUpdate(
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
                  onUpdate(
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
                    onUpdate("ruleBroken", event.target.checked)
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
              onChange={(value) => onUpdate("setupQuality", value)}
            />
            <RecapScoreField
              label="Entry quality"
              value={form.entryQuality ?? 5}
              onChange={(value) => onUpdate("entryQuality", value)}
            />
            <RecapScoreField
              label="Management quality"
              value={form.managementQuality ?? 5}
              onChange={(value) => onUpdate("managementQuality", value)}
            />
            <RecapScoreField
              label="Exit quality"
              value={form.exitQuality ?? 5}
              onChange={(value) => onUpdate("exitQuality", value)}
            />
          </div>
        </section>
      ) : null}
    </form>
  );
}

function TradeRecapSummaryPanel({
  trade,
  onOpenRecap,
}: {
  trade: Trade;
  onOpenRecap: () => void;
}) {
  const recap = trade.recap;

  return (
    <aside
      className={`trade-recap-summary${recap ? " has-recap" : " is-empty"}`}
      aria-label="Trade recap summary"
    >
      <header className="trade-recap-summary-header">
        <span>Trade recap</span>
        <h4>{recap ? "Recap done" : "Recap missing"}</h4>
      </header>

      {recap ? (
        <>
          <div className="trade-recap-summary-grid">
            <SummaryMetric label="Grade" value={recap.grade || "—"} strong />
            <SummaryMetric
              label="Plan"
              value={planFollowedLabel(recap.followedPlan)}
            />
          </div>
          <TradeRecapSummaryTagList
            label="Mistakes"
            emptyLabel="No mistakes selected"
            tags={recap.mistakeTags}
          />
          <TradeRecapSummaryTagList
            label="Done well"
            emptyLabel="Nothing selected yet"
            tags={recap.positiveTags}
          />
          <div className="trade-recap-summary-note">
            <span>Lesson</span>
            <p>{recap.lesson || "No lesson written yet."}</p>
          </div>
          <div className="trade-recap-summary-note">
            <span>Next time</span>
            <p>{recap.nextAction || "No next action written yet."}</p>
          </div>
          <section className="trade-recap-summary-scores">
            <header>
              <span>Scores</span>
              <strong>{recap.ruleBroken ? "Rule broken" : "Rules kept"}</strong>
            </header>
            <div className="trade-recap-score-grid">
              <TradeRecapScoreValue label="Setup" value={recap.setupQuality} />
              <TradeRecapScoreValue label="Entry" value={recap.entryQuality} />
              <TradeRecapScoreValue
                label="Management"
                value={recap.managementQuality}
              />
              <TradeRecapScoreValue label="Exit" value={recap.exitQuality} />
            </div>
          </section>
        </>
      ) : (
        <p className="trade-recap-summary-empty">
          Create a recap to lock in mistakes, what went well, lessons, and
          score.
        </p>
      )}

      <button className="primary-button" type="button" onClick={onOpenRecap}>
        <FileText size={15} aria-hidden="true" />
        <span>{recap ? "Edit recap" : "Create recap"}</span>
      </button>
    </aside>
  );
}

function TradeRecapSummaryTagList({
  emptyLabel,
  label,
  tags,
}: {
  emptyLabel: string;
  label: string;
  tags: string[];
}) {
  return (
    <section className="trade-recap-summary-list">
      <header>
        <span>{label}</span>
        <strong>{tags.length}</strong>
      </header>
      {tags.length > 0 ? (
        <div className="trade-recap-summary-tags">
          {tags.map((tag) => (
            <span className="trade-recap-summary-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </section>
  );
}

function TradeRecapScoreValue({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="trade-recap-score-value">
      <span>{label}</span>
      <strong>{value === null ? "—" : `${value}/10`}</strong>
    </div>
  );
}

function planFollowedLabel(value: TradeRecapInput["followedPlan"]) {
  return (
    PLAN_FOLLOWED_OPTIONS.find((option) => option.value === value)?.label ?? "—"
  );
}

type TradeContextRow = {
  label: string;
  tone?: string;
  value: ReactNode;
};

function TradeRecapContextPanel({
  appPreferences,
  currency,
  isSystemAccount,
  sourceLabel,
  trade,
  tradeName,
}: {
  appPreferences: AppPreferences;
  currency: string;
  isSystemAccount: boolean;
  sourceLabel: string;
  trade: Trade;
  tradeName: string;
}) {
  const plannedRr = plannedRiskReward(trade);
  const actualRr = actualRiskReward(trade);
  const preTradeScreenshots = trade.screenshots.filter(
    (screenshot) => screenshot.stage === "pre-trade",
  );
  const entryScreenshots = trade.screenshots.filter(
    (screenshot) => screenshot.stage === "entry",
  );
  const exitScreenshots = trade.screenshots.filter(
    (screenshot) => screenshot.stage === "exit",
  );
  const resultClass = trade.exit.result
    ? `result-pill result-${trade.exit.result}`
    : "result-pill";

  return (
    <aside className="trade-recap-context" aria-label="Trade details">
      <header className="trade-recap-context-header">
        <div>
          <span>{trade.pair || "No instrument"}</span>
          <h4>{tradeName}</h4>
        </div>
        <div className="trade-recap-context-pills">
          <span className={`dir-pill dir-${trade.direction}`}>
            {directionActionLabel(trade.direction)}
          </span>
          <span className={resultClass}>
            {resultShortLabel(trade.exit.result)}
          </span>
        </div>
      </header>

      <div className="trade-recap-context-metrics">
        <SummaryMetric
          label="Date"
          value={formatDateValue(trade.date, appPreferences)}
        />
        <SummaryMetric
          label="Time"
          value={formatTimeForDateValue(
            trade.date,
            tradeListTime(trade),
            appPreferences,
          )}
        />
        <SummaryMetric label="Duration" value={tradeDuration(trade)} />
        <SummaryMetric
          label="P&L"
          value={fmtPnl(trade.pnl, currency, appPreferences)}
          tone={pnlToneClass(trade.pnl)}
        />
        <SummaryMetric label="Planned RR" value={fmtRMultiple(plannedRr)} />
        <SummaryMetric
          label="Actual RR"
          value={fmtRMultiple(actualRr)}
          tone={pnlToneClass(trade.pnl)}
        />
      </div>

      {isSystemAccount ? null : (
        <TradeContextSection
          dotClassName="stage-pre"
          title="Pre-trade"
          rows={[
            { label: sourceLabel, value: trade.preTrade.strategy || "—" },
            { label: "Key level", value: trade.preTrade.keyLevel || "—" },
            {
              label: "Entry condition",
              value: trade.preTrade.entryCondition || "—",
            },
            { label: "Bias", value: trade.preTrade.bias || "—" },
            {
              label: "Risk %",
              value:
                trade.preTrade.riskPercent != null
                  ? `${trade.preTrade.riskPercent}%`
                  : "—",
            },
            {
              label: "Risk amount",
              value:
                trade.preTrade.riskAmount != null
                  ? fmtMoney(
                      trade.preTrade.riskAmount,
                      currency,
                      appPreferences,
                    )
                  : "—",
            },
            {
              label: "Feeling",
              value:
                trade.preTrade.feeling != null
                  ? `${trade.preTrade.feeling}/10`
                  : "—",
            },
            { label: "Screenshots", value: preTradeScreenshots.length },
          ]}
          noteLabel="Setup notes"
          note={trade.preTrade.notes || "No notes yet."}
          screenshots={preTradeScreenshots}
        />
      )}

      <TradeContextSection
        dotClassName="stage-entry"
        title="Entry"
        rows={[
          ...(isSystemAccount
            ? [
                {
                  label: sourceLabel,
                  value: trade.preTrade.strategy || "—",
                },
                {
                  label: "Key level",
                  value: trade.preTrade.keyLevel || "—",
                },
                {
                  label: "Entry condition",
                  value: trade.preTrade.entryCondition || "—",
                },
              ]
            : []),
          {
            label: "Time",
            value: formatTimeForDateValue(
              trade.date,
              trade.entry.time,
              appPreferences,
            ),
          },
          { label: "Entry price", value: fmtPrice(trade.entry.price) },
          { label: "Lot size", value: trade.entry.lotSize ?? "—" },
          { label: "Stop loss", value: fmtPrice(trade.entry.stopLoss) },
          { label: "Take profit", value: fmtPrice(trade.entry.takeProfit) },
          ...(isSystemAccount
            ? []
            : [
                {
                  label: "Confidence",
                  value:
                    trade.entry.confidence != null
                      ? `${trade.entry.confidence}/10`
                      : "—",
                },
              ]),
          { label: "Screenshots", value: entryScreenshots.length },
        ]}
        noteLabel="Entry notes"
        note={trade.entry.notes || "No notes yet."}
        screenshots={entryScreenshots}
      />

      <TradeContextSection
        dotClassName="stage-exit"
        title="Exit"
        rows={[
          {
            label: "Time",
            value: formatTimeForDateValue(
              trade.date,
              trade.exit.time,
              appPreferences,
            ),
          },
          { label: "Exit price", value: fmtPrice(trade.exit.price) },
          { label: "Result", value: resultLabel(trade.exit.result) },
          {
            label: "Exit condition",
            value: trade.exit.exitCondition || "—",
          },
          {
            label: "P&L",
            value: fmtPnl(trade.pnl, currency, appPreferences),
            tone: pnlToneClass(trade.pnl),
          },
          ...(isSystemAccount
            ? []
            : [
                {
                  label: "Feeling",
                  value:
                    trade.exit.feeling != null
                      ? `${trade.exit.feeling}/10`
                      : "—",
                },
              ]),
          { label: "Screenshots", value: exitScreenshots.length },
        ]}
        noteLabel="Exit note"
        note={trade.exit.note || "No notes yet."}
        screenshots={exitScreenshots}
      />
    </aside>
  );
}

function TradeContextSection({
  dotClassName,
  note,
  noteLabel,
  rows,
  screenshots = [],
  title,
}: {
  dotClassName: string;
  note: string;
  noteLabel: string;
  rows: TradeContextRow[];
  screenshots?: Trade["screenshots"];
  title: string;
}) {
  return (
    <section className="trade-recap-context-section">
      <header>
        <span className={`stage-dot ${dotClassName}`} aria-hidden="true" />
        <h5>{title}</h5>
      </header>
      <dl className="trade-recap-context-rows">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd className={row.tone ?? ""}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="trade-recap-context-note">
        <span>{noteLabel}</span>
        <p>{note}</p>
      </div>
      {screenshots.length > 0 ? (
        <div className="trade-recap-context-screenshots">
          <span>Screenshots</span>
          <ReadOnlyTradeScreenshotGallery screenshots={screenshots} />
        </div>
      ) : null}
    </section>
  );
}

function RecapQuickTextArea({
  label,
  options,
  placeholder,
  quickLabel,
  value,
  onChange,
  onToggle,
}: {
  label: string;
  options: string[];
  placeholder: string;
  quickLabel: string;
  value: string;
  onChange: (value: string) => void;
  onToggle: (option: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const selectedCount = options.filter((option) =>
    hasQuickTextValue(value, option),
  ).length;

  return (
    <div className={`recap-quick-text-area${open ? " is-open" : ""}`}>
      <div className="field">
        <span id={labelId}>{label}</span>
        <div className="recap-textarea-shell">
          <textarea
            aria-labelledby={labelId}
            rows={3}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
          <button
            className="recap-textarea-plus"
            type="button"
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${quickLabel}`}
            onClick={() => setOpen((current) => !current)}
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      {open ? (
        <RecapQuickTextGroup
          label={
            selectedCount > 0
              ? `${quickLabel} - ${selectedCount} selected`
              : quickLabel
          }
          options={options}
          value={value}
          onToggle={onToggle}
        />
      ) : null}
    </div>
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

type RecapGroupedTag = {
  group: string;
  options: string[];
};

function RecapGroupedTagSection({
  addLabel,
  emptyLabel,
  groups,
  selected,
  onToggle,
}: {
  addLabel: string;
  emptyLabel: string;
  groups: RecapGroupedTag[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <div className="recap-picker-groups">
      {groups.map((group) => {
        const selectedInGroup = group.options.filter((option) =>
          selected.includes(option),
        );
        const isOpen = openGroup === group.group;

        return (
          <section
            className={`recap-picker-group${isOpen ? " is-open" : ""}`}
            key={group.group}
          >
            <header className="recap-picker-group-header">
              <div>
                <h5>{group.group}</h5>
                <span>
                  {selectedInGroup.length > 0
                    ? `${selectedInGroup.length} selected`
                    : emptyLabel}
                </span>
              </div>
              <button
                className="recap-picker-add-button"
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.group)}
              >
                <Plus size={14} aria-hidden="true" />
                <span>{isOpen ? "Close" : addLabel}</span>
              </button>
            </header>

            {selectedInGroup.length > 0 ? (
              <div className="recap-selected-chip-list">
                {selectedInGroup.map((tag) => (
                  <button
                    className="recap-selected-chip"
                    type="button"
                    key={tag}
                    onClick={() => onToggle(tag)}
                    aria-label={`Remove ${tag}`}
                  >
                    <span>{tag}</span>
                    <strong aria-hidden="true">x</strong>
                  </button>
                ))}
              </div>
            ) : null}

            {isOpen ? (
              <div className="recap-picker-panel">
                <div className="recap-picker-options">
                  {group.options.map((option) => (
                    <label className="recap-picker-option" key={option}>
                      <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={() => onToggle(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <div className="recap-picker-panel-footer">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setOpenGroup(null)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

type WeeklyTradesListProps = {
  collapsedWeeks: Record<string, boolean>;
  appPreferences: AppPreferences;
  selectedAccount: TradingAccount | null;
  trades: Trade[];
  onCreateRecap: (trade: Trade) => void;
  onSelectTrade: (tradeId: string) => void;
  onToggleWeek: (weekKey: string) => void;
};

function WeeklyTradesList({
  collapsedWeeks,
  appPreferences,
  selectedAccount,
  trades,
  onCreateRecap,
  onSelectTrade,
  onToggleWeek,
}: WeeklyTradesListProps) {
  const weekGroups = useMemo(() => {
    const grouped = new Map<string, { start: Date; trades: Trade[] }>();
    for (const trade of trades) {
      const start = startOfWeek(parseTradeDate(trade.date), appPreferences);
      const key = dateKey(start);
      const group = grouped.get(key) ?? { start, trades: [] };
      group.trades.push(trade);
      grouped.set(key, group);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, group]) => ({ key, ...group }));
  }, [appPreferences, trades]);

  return (
    <div className="trade-week-list">
      {weekGroups.map((group) => {
        const isCollapsed = collapsedWeeks[group.key] ?? false;
        const weekPnl = tradePnlTotal(group.trades);
        const missingRecaps =
          selectedAccount?.accountType === "backtesting"
            ? 0
            : missingRecapCount(group.trades);

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
                <span>{formatWeekLabel(group.start, appPreferences)}</span>
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
                  {fmtPnl(
                    weekPnl,
                    selectedAccount?.currency ?? "USD",
                    appPreferences,
                  )}
                </strong>
              </span>
            </button>
            {isCollapsed ? null : (
              <TradesListTable
                accountTrades={trades}
                appPreferences={appPreferences}
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
  appPreferences: AppPreferences;
  educators: Educator[];
  riskPlan: RiskManagementPlan | null;
  sourceLabel: string;
  tradeSources: Array<{ id: string; name: string }>;
  strategies: Strategy[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type NewTradeFormState = {
  date: string;
  pair: string;
  direction: "long" | "short";
  strategy: string;
  keyLevel: string;
  entryCondition: string;
  exitCondition: string;
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
  tradeSources,
}: {
  accountBalance: number | null;
  riskPlan: RiskManagementPlan | null;
  tradeSources: Array<{ id: string; name: string }>;
}): NewTradeFormState {
  const riskPercent = formatFormNumber(defaultRiskPercent(riskPlan));
  return {
    date: todayInputValue(),
    pair: "",
    direction: "long",
    strategy: tradeSources[0]?.name ?? "",
    keyLevel: "",
    entryCondition: "",
    exitCondition: "",
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
  appPreferences,
  educators,
  riskPlan,
  sourceLabel,
  tradeSources,
  strategies,
  onClose,
  onSaved,
}: NewTradeWorkflowProps) {
  const isSystemAccount = account.accountType === "system";
  const [form, setForm] = useState<NewTradeFormState>(() =>
    createDefaultNewTrade({ accountBalance, riskPlan, tradeSources }),
  );
  const [screenshots, setScreenshots] = useState<NewTradeScreenshotState>(
    createEmptyScreenshotState,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeStrategy = useMemo(() => {
    if (isSystemAccount) {
      const educator = educators.find((item) => item.name === form.strategy);
      return educator?.strategyId
        ? (strategies.find((item) => item.id === educator.strategyId) ?? null)
        : null;
    }
    return strategies.find((item) => item.name === form.strategy) ?? null;
  }, [educators, form.strategy, isSystemAccount, strategies]);

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
    if (tradeSources.length === 0) {
      setSaveError(
        `Selected account needs at least one linked ${sourceLabel.toLowerCase()}.`,
      );
      return;
    }
    if (!form.pair.trim()) {
      setSaveError("Pair is required.");
      return;
    }
    if (!form.strategy.trim()) {
      setSaveError(`${sourceLabel} is required.`);
      return;
    }
    const riskPercentValue = parseNumber(form.riskPercent);
    if (!isSystemAccount && riskPlan) {
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
        keyLevel: form.keyLevel,
        entryCondition: form.entryCondition,
        riskPercent: isSystemAccount ? null : parseNumber(form.riskPercent),
        riskAmount: isSystemAccount ? null : parseNumber(form.riskAmount),
        bias: isSystemAccount ? "" : form.bias.trim(),
        notes: isSystemAccount ? "" : form.setupNotes.trim(),
        feeling: isSystemAccount ? null : form.feelingBefore,
      },
      entry: {
        time: form.entryTime || null,
        price: parseNumber(form.entryPrice),
        lotSize: parseNumber(form.lotSize),
        stopLoss: parseNumber(form.stopLoss),
        takeProfit: parseNumber(form.takeProfit),
        notes: form.entryNotes.trim(),
        confidence: isSystemAccount || !hasEntryInput ? null : form.confidence,
      },
      exit: {
        price: parseNumber(form.exitPrice),
        result: form.result,
        note: form.exitNote.trim(),
        feeling: isSystemAccount || !hasExitInput ? null : form.feelingAfter,
        time: form.exitTime || null,
        exitCondition: form.exitCondition,
      },
      pnl: parseNumber(form.pnl),
      backtestSessionId: null,
      backtestTestedAt: null,
      backtestTargets: [],
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
      subtitle={
        isSystemAccount
          ? `${account.name} / System Account`
          : `${account.name} / ${riskPlanRangeLabel(riskPlan)}`
      }
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
      <div
        className={`trade-workflow-grid ${
          isSystemAccount ? "trade-workflow-grid-system" : ""
        }`}
      >
        {isSystemAccount ? null : (
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
                <span>{sourceLabel}</span>
                <select
                  value={form.strategy}
                  onChange={(event) => update("strategy", event.target.value)}
                  disabled={tradeSources.length === 0}
                >
                  {tradeSources.length === 0 ? (
                    <option value="">
                      No linked {sourceLabel.toLowerCase()}
                    </option>
                  ) : (
                    tradeSources.map((source) => (
                      <option key={source.id} value={source.name}>
                        {source.name}
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
              <WorkflowTemplateSelect
                label="Key level"
                options={activeStrategy?.keyLevels ?? []}
                value={form.keyLevel}
                onChange={(value) => update("keyLevel", value)}
              />
              <WorkflowTemplateSelect
                label="Entry condition"
                options={activeStrategy?.entryConditions ?? []}
                value={form.entryCondition}
                onChange={(value) => update("entryCondition", value)}
              />
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
                    : formatCurrencyValue(
                        accountBalance,
                        account.currency,
                        appPreferences,
                      )}
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
                confirmBeforeDelete={appPreferences.confirmBeforeDelete}
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
        )}

        <section className="workflow-card workflow-card-entry">
          <WorkflowCardHeader title="Entry" subtitle="Execution details" />
          <div className="stage-field-grid">
            {isSystemAccount ? (
              <>
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
                <label className="field field-wide">
                  <span>{sourceLabel}</span>
                  <select
                    value={form.strategy}
                    onChange={(event) => update("strategy", event.target.value)}
                    disabled={tradeSources.length === 0}
                  >
                    {tradeSources.length === 0 ? (
                      <option value="">
                        No linked {sourceLabel.toLowerCase()}
                      </option>
                    ) : (
                      tradeSources.map((source) => (
                        <option key={source.id} value={source.name}>
                          {source.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <WorkflowTemplateSelect
                  label="Key level"
                  options={activeStrategy?.keyLevels ?? []}
                  value={form.keyLevel}
                  onChange={(value) => update("keyLevel", value)}
                />
                <WorkflowTemplateSelect
                  label="Entry condition"
                  options={activeStrategy?.entryConditions ?? []}
                  value={form.entryCondition}
                  onChange={(value) => update("entryCondition", value)}
                />
              </>
            ) : null}
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
              confirmBeforeDelete={appPreferences.confirmBeforeDelete}
              stage="entry"
              screenshots={screenshots.entry}
              onImported={(path) => addDraftScreenshot("entry", path)}
              onDelete={(id) => removeDraftScreenshot("entry", id)}
            />
            {isSystemAccount ? null : (
              <ScaleField
                label="Confidence"
                value={form.confidence}
                onChange={(value) => update("confidence", value)}
              />
            )}
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
            <WorkflowTemplateSelect
              label="Exit condition"
              options={activeStrategy?.exitConditions ?? []}
              value={form.exitCondition}
              onChange={(value) => update("exitCondition", value)}
              wide
            />
          </div>
          <div className="workflow-card-footer">
            <WorkflowScreenshotSlot
              confirmBeforeDelete={appPreferences.confirmBeforeDelete}
              stage="exit"
              screenshots={screenshots.exit}
              onImported={(path) => addDraftScreenshot("exit", path)}
              onDelete={(id) => removeDraftScreenshot("exit", id)}
            />
            {isSystemAccount ? null : (
              <ScaleField
                label="Feeling after trade"
                value={form.feelingAfter}
                onChange={(value) => update("feelingAfter", value)}
              />
            )}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}

type WorkflowScreenshotSlotProps = {
  confirmBeforeDelete: boolean;
  stage: NewTradeScreenshotStage;
  screenshots: DraftScreenshot[];
  onImported: (path: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

function WorkflowScreenshotSlot({
  confirmBeforeDelete,
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
            confirmBeforeDelete={confirmBeforeDelete}
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

function WorkflowTemplateSelect({
  label,
  onChange,
  options,
  value,
  wide = false,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
      >
        <option value="">
          {options.length === 0 ? `No ${label.toLowerCase()} options` : "None"}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
  appPreferences: AppPreferences;
  deleteError: string | null;
  trade: Trade;
  tradeName: string;
  tradeSources: Array<{ id: string; name: string }>;
  strategyTemplate: Strategy | null;
  onChanged: () => Promise<void>;
};

function TradeDetail({
  account,
  appPreferences,
  deleteError,
  trade,
  tradeName,
  tradeSources,
  strategyTemplate,
  onChanged,
}: TradeDetailProps) {
  const [preTradeOpen, setPreTradeOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const currency = account?.currency ?? "USD";
  const isSystemAccount = account?.accountType === "system";
  const isBacktestingAccount = account?.accountType === "backtesting";
  const isTwoStageAccount = isSystemAccount || isBacktestingAccount;
  const sourceLabel = tradeSourceLabel(account);

  return (
    <div className="trade-detail">
      {deleteError ? (
        <p className="trade-delete-error" role="alert">
          {deleteError}
        </p>
      ) : null}

      <section
        className={`trade-cards ${isTwoStageAccount ? "trade-cards-system" : ""}`}
      >
        {isTwoStageAccount ? null : (
          <PreTradeCard
            appPreferences={appPreferences}
            currency={currency}
            sourceLabel={sourceLabel}
            trade={trade}
            onEdit={() => setPreTradeOpen(true)}
            onChanged={onChanged}
          />
        )}
        <EntryCard
          appPreferences={appPreferences}
          isSystemAccount={isTwoStageAccount}
          sourceLabel={sourceLabel}
          trade={trade}
          onEdit={() => setEntryOpen(true)}
          onChanged={onChanged}
        />
        <ExitCard
          currency={currency}
          appPreferences={appPreferences}
          isSystemAccount={isTwoStageAccount}
          trade={trade}
          onEdit={() => setExitOpen(true)}
          onChanged={onChanged}
        />
      </section>

      {!isTwoStageAccount && preTradeOpen ? (
        <PreTradeForm
          confirmBeforeDelete={appPreferences.confirmBeforeDelete}
          sourceLabel={tradeSourceLabel(account)}
          strategyTemplate={strategyTemplate}
          trade={trade}
          tradeName={tradeName}
          onChanged={onChanged}
          onClose={() => setPreTradeOpen(false)}
          onSaved={async () => {
            setPreTradeOpen(false);
            await onChanged();
          }}
        />
      ) : null}
      {entryOpen ? (
        <EntryForm
          appPreferences={appPreferences}
          isSystemAccount={isTwoStageAccount}
          sourceLabel={sourceLabel}
          trade={trade}
          tradeName={tradeName}
          tradeSources={tradeSources}
          strategyTemplate={strategyTemplate}
          onChanged={onChanged}
          onClose={() => setEntryOpen(false)}
          onSaved={async () => {
            setEntryOpen(false);
            await onChanged();
          }}
        />
      ) : null}
      {exitOpen ? (
        <ExitForm
          appPreferences={appPreferences}
          isSystemAccount={isTwoStageAccount}
          trade={trade}
          tradeName={tradeName}
          strategyTemplate={strategyTemplate}
          onChanged={onChanged}
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

function TradeSummaryStrip({
  account,
  accountTrades,
  appPreferences,
  trade,
}: {
  account: TradingAccount | null;
  accountTrades: Trade[];
  appPreferences: AppPreferences;
  trade: Trade;
}) {
  const plannedRr = plannedRiskReward(trade);
  const actualRr = actualRiskReward(trade);
  const currency = account?.currency ?? "USD";
  const balance = tradeBalanceSummary(account, accountTrades, trade);

  return (
    <div className="trade-summary-strip" aria-label="Trade summary">
      <SummaryMetric
        label="Date"
        value={formatDateValue(trade.date, appPreferences)}
      />
      <SummaryMetric label="Duration" value={tradeDuration(trade)} />
      <SummaryMetric
        label="Balance before"
        value={fmtMoney(balance.before, currency, appPreferences)}
      />
      <SummaryMetric
        label="Balance after"
        value={fmtMoney(balance.after, currency, appPreferences)}
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
        value={fmtPercent(balance.growthPercent, appPreferences)}
        tone={pnlToneClass(balance.growthPercent)}
      />
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
  appPreferences,
  isSystemAccount,
  sourceLabel,
  trade,
  onEdit,
  onChanged,
}: {
  appPreferences: AppPreferences;
  isSystemAccount: boolean;
  sourceLabel: string;
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
          {isSystemAccount ? (
            <>
              <div>
                <dt>{sourceLabel}</dt>
                <dd>{trade.preTrade.strategy || "—"}</dd>
              </div>
              {trade.backtestTestedAt ? (
                <div>
                  <dt>Backtested</dt>
                  <dd>
                    {formatDateValue(trade.backtestTestedAt, appPreferences)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>Key level</dt>
                <dd>{trade.preTrade.keyLevel || "—"}</dd>
              </div>
              <div>
                <dt>Entry condition</dt>
                <dd>{trade.preTrade.entryCondition || "—"}</dd>
              </div>
            </>
          ) : null}
          <div>
            <dt>Entry time</dt>
            <dd>
              {formatTimeForDateValue(trade.date, entry.time, appPreferences)}
            </dd>
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
              confirmBeforeDelete={appPreferences.confirmBeforeDelete}
              screenshots={screenshots}
              onChanged={onChanged}
            />
          ) : null}
        </div>
        {!isSystemAccount && entry.confidence != null ? (
          <ScaleDisplay label="Confidence" value={entry.confidence} />
        ) : null}
      </div>
    </article>
  );
}

function ExitCard({
  currency,
  appPreferences,
  isSystemAccount,
  trade,
  onEdit,
  onChanged,
}: {
  currency: string;
  appPreferences: AppPreferences;
  isSystemAccount: boolean;
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
            <dd>
              {formatTimeForDateValue(trade.date, exit.time, appPreferences)}
            </dd>
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
              {fmtPnl(trade.pnl, currency, appPreferences)}
            </dd>
          </div>
          <div>
            <dt>Exit condition</dt>
            <dd>{exit.exitCondition || "—"}</dd>
          </div>
        </div>
        {trade.backtestTargets.length > 0 ? (
          <div className="trade-card-note">
            <dt>Target results</dt>
            <dd className="backtest-saved-targets">
              {trade.backtestTargets.map((target, index) => (
                <span key={`${index}-${target.takeProfit}`}>
                  TP {index + 1}: {fmtPrice(target.takeProfit)} /{" "}
                  {resultLabel(target.result)}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
        <div className="trade-card-note">
          <dt>Exit note</dt>
          <dd>{exit.note || "No notes yet."}</dd>
        </div>
      </dl>
      <div className="trade-card-bottom">
        <div className="trade-card-screenshots">
          {screenshots.length > 0 ? (
            <TradeScreenshotGallery
              confirmBeforeDelete={appPreferences.confirmBeforeDelete}
              screenshots={screenshots}
              onChanged={onChanged}
            />
          ) : null}
        </div>
        {!isSystemAccount && exit.feeling != null ? (
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
  appPreferences: AppPreferences;
  isSystemAccount: boolean;
  sourceLabel: string;
  trade: Trade;
  tradeName: string;
  tradeSources: Array<{ id: string; name: string }>;
  strategyTemplate: Strategy | null;
  onChanged: () => void | Promise<void>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function EntryForm({
  appPreferences,
  isSystemAccount,
  sourceLabel,
  trade,
  tradeName,
  tradeSources,
  strategyTemplate,
  onChanged,
  onClose,
  onSaved,
}: EntryFormProps) {
  const [form, setForm] = useState({
    strategy: trade.preTrade.strategy,
    keyLevel: trade.preTrade.keyLevel,
    entryCondition: trade.preTrade.entryCondition,
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
      confidence: isSystemAccount ? null : form.confidence,
    };

    setSaving(true);
    try {
      await Promise.all([
        saveEntry(trade.id, entry, form.direction),
        ...(isSystemAccount
          ? [
              savePreTrade(trade.id, {
                strategy: form.strategy.trim(),
                keyLevel: form.keyLevel,
                entryCondition: form.entryCondition,
                riskPercent: null,
                riskAmount: null,
                bias: "",
                notes: "",
                feeling: null,
              }),
            ]
          : []),
      ]);
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
      title={`Entry - ${tradeName}`}
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
      <div className="stage-editor-form">
        <section className="pre-section">
          <header className="pre-section-header">
            <h4>Screenshots</h4>
          </header>
          <TradeScreenshotDropZone
            confirmBeforeDelete={appPreferences.confirmBeforeDelete}
            screenshots={trade.screenshots.filter((s) => s.stage === "entry")}
            stage="entry"
            tradeId={trade.id}
            onChanged={onChanged}
          />
        </section>
        <div className="form-grid">
          {isSystemAccount ? (
            <>
              <label className="field">
                <span>{sourceLabel}</span>
                <select
                  value={form.strategy}
                  onChange={(event) => update("strategy", event.target.value)}
                  disabled={tradeSources.length === 0}
                  required
                >
                  {tradeSources.length === 0 ? (
                    <option value="">
                      No linked {sourceLabel.toLowerCase()}
                    </option>
                  ) : (
                    tradeSources.map((source) => (
                      <option key={source.id} value={source.name}>
                        {source.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <WorkflowTemplateSelect
                label="Key level"
                options={strategyTemplate?.keyLevels ?? []}
                value={form.keyLevel}
                onChange={(value) => update("keyLevel", value)}
              />
              <WorkflowTemplateSelect
                label="Entry condition"
                options={strategyTemplate?.entryConditions ?? []}
                value={form.entryCondition}
                onChange={(value) => update("entryCondition", value)}
              />
            </>
          ) : null}
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
          {isSystemAccount ? null : (
            <ScaleField
              label="Confidence"
              value={form.confidence}
              onChange={(value) => update("confidence", value)}
            />
          )}
        </div>
      </div>
    </ModalShell>
  );
}

type ExitFormProps = {
  appPreferences: AppPreferences;
  isSystemAccount: boolean;
  trade: Trade;
  tradeName: string;
  strategyTemplate: Strategy | null;
  onChanged: () => void | Promise<void>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function ExitForm({
  appPreferences,
  isSystemAccount,
  trade,
  tradeName,
  strategyTemplate,
  onChanged,
  onClose,
  onSaved,
}: ExitFormProps) {
  const [form, setForm] = useState({
    price: trade.exit.price?.toString() ?? "",
    result: trade.exit.result,
    pnl: trade.pnl?.toString() ?? "",
    time: trade.exit.time ?? "",
    note: trade.exit.note,
    feeling: trade.exit.feeling ?? 5,
    exitCondition: trade.exit.exitCondition,
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
      feeling: isSystemAccount ? null : form.feeling,
      time: form.time || null,
      exitCondition: form.exitCondition,
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
      title={`Exit - ${tradeName}`}
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
      <div className="stage-editor-form">
        <section className="pre-section">
          <header className="pre-section-header">
            <h4>Screenshots</h4>
          </header>
          <TradeScreenshotDropZone
            confirmBeforeDelete={appPreferences.confirmBeforeDelete}
            screenshots={trade.screenshots.filter((s) => s.stage === "exit")}
            stage="exit"
            tradeId={trade.id}
            onChanged={onChanged}
          />
        </section>
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
          <WorkflowTemplateSelect
            label="Exit condition"
            options={strategyTemplate?.exitConditions ?? []}
            value={form.exitCondition}
            onChange={(value) => update("exitCondition", value)}
            wide
          />
          {isSystemAccount ? null : (
            <ScaleField
              label="Feeling after trade"
              value={form.feeling}
              onChange={(value) => update("feeling", value)}
            />
          )}
        </div>
      </div>
    </ModalShell>
  );
}
