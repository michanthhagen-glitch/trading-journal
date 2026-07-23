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
  deleteTrade,
  listAccountSetup,
  listTrades,
  saveRecap,
  type Educator,
  type RiskManagementPlan,
  type Strategy,
  type Trade,
  type TradeRecapInput,
  type TradingAccount,
} from "../../shared/db/database";
import type { ModuleContext } from "../../app/types";
import { BacktestWorkflow } from "./components/BacktestWorkflow";
import { ReadOnlyTradeScreenshotGallery } from "./components/ScreenshotTools";
import { deleteScreenshotFile } from "../../shared/db/storage";
import {
  formatDateValue,
  formatTimeForDateValue,
  orderedWeekdayLabels,
  shouldConfirmDelete,
  type AppPreferences,
} from "../../shared/appPreferences";
import { ModalShell } from "../../components/ModalShell";
import {
  formatTradeName,
  formatTradeNameWithPair,
} from "../../shared/tradeNames";
import {
  TRADE_RECAP_MISTAKE_GROUPS,
  TRADE_RECAP_QUICK_MISTAKES,
} from "./tradeRecapMistakes";
import {
  TRADE_RECAP_POSITIVE_GROUPS,
  TRADE_RECAP_QUICK_POSITIVES,
} from "./tradeRecapPositives";
import { mergeLinkedStrategies } from "./strategyWorkflow";
import {
  createTradeRecapDraft,
  LIVE_RECAP_EMOTIONS,
  prepareTradeRecapForSave,
  SYSTEM_EXECUTION_MISTAKES,
  SYSTEM_EXECUTION_POSITIVES,
  tradeRecapValidationError,
  type TradeRecapProfile,
} from "./tradeRecapWorkflow";
import {
  accountBalance,
  actualRiskReward,
  addMonths,
  calendarDays,
  dateKey,
  dayBalanceSummary,
  directionActionLabel,
  displayTakeProfits,
  firstOfMonth,
  fmtMoney,
  fmtPercent,
  fmtPnl,
  fmtPrice,
  fmtRMultiple,
  formatDayDialogTitle,
  formatMonthLabel,
  formatWeekLabel,
  missingRecapCount,
  parseTradeDate,
  plannedRiskReward,
  pnlToneClass,
  resultLabel,
  resultShortLabel,
  sameMonth,
  startOfWeek,
  todayInputValue,
  tradeBalanceSummary,
  tradeDuration,
  tradeListDateTime,
  tradeListTime,
  tradePnlTotal,
  tradeSourceLabel,
} from "./tradePresentation";

import { NewTradeWorkflow, ScaleBars } from "./NewTradeWorkflow";

import { SummaryMetric, TradeDetail, TradeSummaryStrip } from "./TradeDetails";

type TradesView = "calendar" | "list";
type TradeWorkspaceMode = "trade" | "recap";

const TRADE_VIEWS: { id: TradesView; label: string; icon: ReactNode }[] = [
  { id: "calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
  { id: "list", label: "List", icon: <ListIcon size={16} /> },
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
      return educator
        ? mergeLinkedStrategies(educator.strategyIds, strategies)
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

  function openNextMissingRecap(currentTradeId: string) {
    const nextTrade = trades.find(
      (trade) =>
        trade.id !== currentTradeId &&
        trade.status === "closed" &&
        !trade.hasRecap,
    );
    setWorkspace(nextTrade ? { tradeId: nextTrade.id, mode: "recap" } : null);
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
          onOpenNextMissingRecap={openNextMissingRecap}
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
  onOpenNextMissingRecap: (currentTradeId: string) => void;
};

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
  onOpenNextMissingRecap,
}: TradeWorkspaceDialogProps) {
  const currency = account?.currency ?? "USD";
  const isRecapMode = mode === "recap";
  const recapProfile: TradeRecapProfile =
    account?.accountType === "system" ? "system" : "live-demo";
  const tradeName = formatTradeName(trade, accountTrades);
  const tradeNameWithPair = formatTradeNameWithPair(trade, accountTrades);
  const hasNextMissingRecap = accountTrades.some(
    (item) =>
      item.id !== trade.id && item.status === "closed" && !item.hasRecap,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [recapForm, setRecapForm] = useState<TradeRecapInput>(() =>
    createTradeRecapDraft(trade.recap, recapProfile),
  );
  const [recapSaving, setRecapSaving] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);

  useEffect(() => {
    setRecapForm(createTradeRecapDraft(trade.recap, recapProfile));
    setRecapError(null);
    setRecapSaving(false);
  }, [recapProfile, trade.id]);

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
    const validationError = tradeRecapValidationError(recapForm, recapProfile);
    if (validationError) {
      setRecapError(validationError);
      return;
    }

    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    const shouldOpenNext = submitter?.value === "save-and-next";
    setRecapError(null);
    setRecapSaving(true);
    try {
      await saveRecap(
        trade.id,
        prepareTradeRecapForSave(recapForm, recapProfile),
      );
      await onChanged();
      if (shouldOpenNext) onOpenNextMissingRecap(trade.id);
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
            {hasNextMissingRecap ? (
              <button
                className="secondary-button"
                type="submit"
                form="trade-recap-editor-form"
                name="recap-save-intent"
                value="save-and-next"
                disabled={recapSaving}
              >
                Save & next
              </button>
            ) : null}
            <button
              className="primary-button"
              type="submit"
              form="trade-recap-editor-form"
              name="recap-save-intent"
              value="save"
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
              form={recapForm}
              profile={recapProfile}
              onSubmit={handleRecapSubmit}
              onToggleQuickText={toggleRecapQuickText}
              onToggleTag={toggleRecapTag}
              onUpdate={updateRecap}
            />
          ) : (
            <TradeRecapSummaryPanel
              isSystemAccount={recapProfile === "system"}
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
  form: TradeRecapInput;
  profile: TradeRecapProfile;
  onSubmit: (event: React.FormEvent) => void | Promise<void>;
  onToggleQuickText: (key: "lesson" | "nextAction", option: string) => void;
  onToggleTag: (key: "mistakeTags" | "positiveTags", tag: string) => void;
  onUpdate: <K extends keyof TradeRecapInput>(
    key: K,
    value: TradeRecapInput[K],
  ) => void;
};

function TradeRecapEditor({
  form,
  profile,
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
      <header className="recap-editor-heading">
        <div>
          <span>
            {profile === "system" ? "System account" : "Live / Demo account"}
          </span>
          <h3>
            {profile === "system" ? "Execution recap" : "Quick trade recap"}
          </h3>
          <p>
            {profile === "system"
              ? "Review only how you executed the call. The educator is not scored."
              : "Capture the useful part first. Deeper scoring stays optional."}
          </p>
        </div>
        <span className="recap-speed-badge">Quick review</span>
      </header>

      {profile === "system" ? (
        <>
          <section className="recap-decision-grid is-system">
            <RecapChoiceField
              label="Followed the call?"
              options={PLAN_FOLLOWED_OPTIONS}
              selected={form.followedPlan}
              onChange={(value) =>
                onUpdate(
                  "followedPlan",
                  value as TradeRecapInput["followedPlan"],
                )
              }
            />
            <RecapChoiceField
              label="Execution grade"
              options={TRADE_RECAP_GRADES.map((grade) => ({
                value: grade,
                label: grade,
              }))}
              selected={form.grade}
              onChange={(value) =>
                onUpdate("grade", value as TradeRecapInput["grade"])
              }
            />
          </section>

          <section className="recap-fast-section">
            <div className="recap-section-title-row">
              <div>
                <h4>Execution markers</h4>
                <p>Optional one-click details for your own statistics.</p>
              </div>
            </div>
            <div className="recap-fast-columns">
              <RecapQuickTagGroup
                label="Done well"
                options={SYSTEM_EXECUTION_POSITIVES}
                selected={form.positiveTags}
                onToggle={(tag) => onToggleTag("positiveTags", tag)}
              />
              <RecapQuickTagGroup
                label="Execution issues"
                options={SYSTEM_EXECUTION_MISTAKES}
                selected={form.mistakeTags}
                onToggle={(tag) => onToggleTag("mistakeTags", tag)}
              />
            </div>
          </section>

          <label className="field recap-main-note">
            <span>Execution note (optional)</span>
            <textarea
              rows={5}
              value={form.body}
              onChange={(event) => onUpdate("body", event.target.value)}
              placeholder="Anything useful about how you entered, managed, or exited?"
            />
          </label>
        </>
      ) : (
        <>
          <section className="recap-decision-grid">
            <RecapChoiceField
              label="Followed your plan?"
              options={PLAN_FOLLOWED_OPTIONS}
              selected={form.followedPlan}
              onChange={(value) =>
                onUpdate(
                  "followedPlan",
                  value as TradeRecapInput["followedPlan"],
                )
              }
            />
            <RecapChoiceField
              label="Trade grade"
              options={TRADE_RECAP_GRADES.map((grade) => ({
                value: grade,
                label: grade,
              }))}
              selected={form.grade}
              onChange={(value) =>
                onUpdate("grade", value as TradeRecapInput["grade"])
              }
            />
            <RecapChoiceField
              label="Rules"
              options={[
                { value: "kept", label: "Kept" },
                { value: "broken", label: "Broken" },
              ]}
              selected={form.ruleBroken ? "broken" : "kept"}
              onChange={(value) => onUpdate("ruleBroken", value === "broken")}
            />
          </section>

          <section className="recap-fast-section">
            <div className="recap-section-title-row">
              <div>
                <h4>Mindset</h4>
                <p>Optional. Pick the strongest feeling during the trade.</p>
              </div>
            </div>
            <RecapChoiceField
              compact
              label="Emotion"
              options={LIVE_RECAP_EMOTIONS}
              selected={form.emotionTag || "none"}
              onChange={(value) => onUpdate("emotionTag", value)}
            />
          </section>

          <section className="recap-fast-section">
            <div className="recap-section-title-row">
              <div>
                <h4>What stood out?</h4>
                <p>Optional. The most common choices are ready to tap.</p>
              </div>
            </div>
            <div className="recap-fast-columns">
              <RecapQuickTagGroup
                label="Done well"
                options={TRADE_RECAP_QUICK_POSITIVES}
                selected={form.positiveTags}
                onToggle={(tag) => onToggleTag("positiveTags", tag)}
              />
              <RecapQuickTagGroup
                label="Mistakes"
                options={TRADE_RECAP_QUICK_MISTAKES}
                selected={form.mistakeTags}
                onToggle={(tag) => onToggleTag("mistakeTags", tag)}
              />
            </div>
          </section>

          <section className="recap-fast-section">
            <div className="recap-note-grid">
              <div className="recap-text-block">
                <RecapQuickTextArea
                  label="Key takeaway (optional)"
                  quickLabel="Quick lessons"
                  options={LESSON_OPTIONS}
                  placeholder="What is worth remembering?"
                  value={form.lesson}
                  onChange={(value) => onUpdate("lesson", value)}
                  onToggle={(option) => onToggleQuickText("lesson", option)}
                />
              </div>
              <div className="recap-text-block">
                <RecapQuickTextArea
                  label="Next focus (optional)"
                  quickLabel="Quick next steps"
                  options={NEXT_TIME_OPTIONS}
                  placeholder="One thing to focus on next time"
                  value={form.nextAction}
                  onChange={(value) => onUpdate("nextAction", value)}
                  onToggle={(option) => onToggleQuickText("nextAction", option)}
                />
              </div>
            </div>
          </section>

          <details className="recap-advanced-panel">
            <summary>
              <div>
                <strong>Detailed review</strong>
                <span>Quality scores, full tag library, and extra notes</span>
              </div>
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <div className="recap-advanced-content">
              <section>
                <h4>Quality scores</h4>
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
              <section className="recap-full-library">
                <div>
                  <h4>All positives</h4>
                  <RecapGroupedTagSection
                    groups={TRADE_RECAP_POSITIVE_CATALOG}
                    emptyLabel="Nothing selected yet"
                    addLabel="Browse"
                    selected={form.positiveTags}
                    onToggle={(tag) => onToggleTag("positiveTags", tag)}
                  />
                </div>
                <div>
                  <h4>All mistakes</h4>
                  <RecapGroupedTagSection
                    groups={TRADE_RECAP_MISTAKE_CATALOG}
                    emptyLabel="No mistakes selected"
                    addLabel="Browse"
                    selected={form.mistakeTags}
                    onToggle={(tag) => onToggleTag("mistakeTags", tag)}
                  />
                </div>
              </section>
              <label className="field">
                <span>Extra notes</span>
                <textarea
                  rows={3}
                  value={form.body}
                  onChange={(event) => onUpdate("body", event.target.value)}
                  placeholder="Anything else worth remembering"
                />
              </label>
            </div>
          </details>
        </>
      )}
    </form>
  );
}

function RecapChoiceField({
  compact = false,
  label,
  options,
  selected,
  onChange,
}: {
  compact?: boolean;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className={`recap-choice-field${compact ? " is-compact" : ""}`}>
      <legend>{label}</legend>
      <div className="recap-choice-list">
        {options.map((option) => (
          <button
            className={`recap-choice-button${selected === option.value ? " is-selected" : ""}`}
            type="button"
            aria-pressed={selected === option.value}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function RecapQuickTagGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const visibleOptions = [
    ...options,
    ...selected.filter((tag) => !options.includes(tag)),
  ];

  return (
    <fieldset className="recap-quick-tag-group">
      <legend>
        <span>{label}</span>
        <strong>{selected.length || ""}</strong>
      </legend>
      <div className="recap-quick-list">
        {visibleOptions.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              className={`recap-quick-option${isSelected ? " is-selected" : ""}`}
              type="button"
              aria-pressed={isSelected}
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

function TradeRecapSummaryPanel({
  isSystemAccount,
  trade,
  onOpenRecap,
}: {
  isSystemAccount: boolean;
  trade: Trade;
  onOpenRecap: () => void;
}) {
  const recap = trade.recap;
  const systemNote =
    recap?.body.trim() ||
    recap?.lesson.trim() ||
    recap?.nextAction.trim() ||
    "";
  const emotionLabel =
    LIVE_RECAP_EMOTIONS.find((emotion) => emotion.value === recap?.emotionTag)
      ?.label ?? "Neutral";

  return (
    <aside
      className={`trade-recap-summary${recap ? " has-recap" : " is-empty"}`}
      aria-label="Trade recap summary"
    >
      <header className="trade-recap-summary-header">
        <span>{isSystemAccount ? "System execution" : "Trade recap"}</span>
        <h4>{recap ? "Recap done" : "Recap missing"}</h4>
      </header>

      {recap ? (
        <>
          <div className="trade-recap-summary-grid">
            <SummaryMetric
              label={isSystemAccount ? "Execution" : "Grade"}
              value={recap.grade || "—"}
              strong
            />
            <SummaryMetric
              label={isSystemAccount ? "Followed call" : "Plan"}
              value={planFollowedLabel(recap.followedPlan)}
            />
            {!isSystemAccount ? (
              <>
                <SummaryMetric label="Mindset" value={emotionLabel} />
                <SummaryMetric
                  label="Rules"
                  value={recap.ruleBroken ? "Broken" : "Kept"}
                />
              </>
            ) : null}
          </div>
          <TradeRecapSummaryTagList
            label="Done well"
            emptyLabel="Nothing selected yet"
            tags={recap.positiveTags}
          />
          <TradeRecapSummaryTagList
            label={isSystemAccount ? "Execution issues" : "Mistakes"}
            emptyLabel={
              isSystemAccount
                ? "No execution issues selected"
                : "No mistakes selected"
            }
            tags={recap.mistakeTags}
          />
          {isSystemAccount ? (
            <div className="trade-recap-summary-note">
              <span>Execution note</span>
              <p>{systemNote || "No note added."}</p>
            </div>
          ) : (
            <>
              <div className="trade-recap-summary-note">
                <span>Takeaway</span>
                <p>{recap.lesson || "No takeaway added."}</p>
              </div>
              <div className="trade-recap-summary-note">
                <span>Next focus</span>
                <p>{recap.nextAction || "No next focus added."}</p>
              </div>
            </>
          )}
          {!isSystemAccount ? (
            <section className="trade-recap-summary-scores">
              <header>
                <span>Detailed scores</span>
                <strong>Optional review</strong>
              </header>
              <div className="trade-recap-score-grid">
                <TradeRecapScoreValue
                  label="Setup"
                  value={recap.setupQuality}
                />
                <TradeRecapScoreValue
                  label="Entry"
                  value={recap.entryQuality}
                />
                <TradeRecapScoreValue
                  label="Management"
                  value={recap.managementQuality}
                />
                <TradeRecapScoreValue label="Exit" value={recap.exitQuality} />
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <p className="trade-recap-summary-empty">
          {isSystemAccount
            ? "Review your own execution of this call."
            : "Capture the grade, discipline, and one useful takeaway."}
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
          {
            label: "Take profits",
            value:
              displayTakeProfits(trade.entry)
                .map((target, index) => `TP ${index + 1}: ${fmtPrice(target)}`)
                .join(" · ") || "—",
          },
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
