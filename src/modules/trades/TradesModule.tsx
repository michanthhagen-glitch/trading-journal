import { ArrowLeft, FileText, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  addScreenshot,
  closeTrade,
  deleteTrade,
  insertTrade,
  listAccountSetup,
  listTrades,
  saveEntry,
  type EntryData,
  type ExitData,
  type NewTrade,
  type RiskManagementPlan,
  type Strategy,
  type Trade,
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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [riskPlans, setRiskPlans] = useState<RiskManagementPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

      <div className="panel">
        {loading ? (
          <p className="empty-state">Loading trades...</p>
        ) : trades.length === 0 ? (
          <p className="empty-state">No trades yet. Start with New trade.</p>
        ) : (
          <table className="trades-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Buy/Sell</th>
                <th>Strategy</th>
                <th>Win/Loss/BE</th>
                <th className="num">P&amp;L</th>
                <th className="num">Growth %</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const balance = tradeBalanceSummary(
                  selectedAccount,
                  trades,
                  trade,
                );
                const pnlTone = pnlToneClass(trade.pnl);
                const growthTone = pnlToneClass(balance.growthPercent);

                return (
                  <tr
                    key={trade.id}
                    className="trades-row"
                    onClick={() => setSelectedId(trade.id)}
                  >
                    <td>{trade.date}</td>
                    <td>{tradeListTime(trade)}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="New trade workflow"
      onClick={handleClose}
    >
      <form
        className="modal-card workflow-modal-card"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="modal-header">
          <div>
            <h3>New trade</h3>
            <p className="modal-subtitle">
              {account.name} / {riskPlanRangeLabel(riskPlan)}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={handleClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="modal-body">
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
                    onChange={(event) =>
                      update("setupNotes", event.target.value)
                    }
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
                    onChange={(event) =>
                      update("entryTime", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>Direction</span>
                  <select
                    value={form.direction}
                    onChange={(event) =>
                      update(
                        "direction",
                        event.target.value as "long" | "short",
                      )
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
                    onChange={(event) =>
                      update("entryPrice", event.target.value)
                    }
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
                    onChange={(event) =>
                      update("takeProfit", event.target.value)
                    }
                  />
                </label>
                <label className="field field-wide workflow-notes-field">
                  <span>Entry notes</span>
                  <textarea
                    rows={7}
                    value={form.entryNotes}
                    onChange={(event) =>
                      update("entryNotes", event.target.value)
                    }
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
                    onChange={(event) =>
                      update("exitPrice", event.target.value)
                    }
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
        </div>

        <footer className="modal-footer">
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
        </footer>
      </form>
    </div>
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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Entry details"
      onClick={onClose}
    >
      <form
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="modal-header">
          <h3>Entry - {trade.pair}</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">
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
        </div>
        <footer className="modal-footer">
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
        </footer>
      </form>
    </div>
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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Exit details"
      onClick={onClose}
    >
      <form
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="modal-header">
          <h3>Exit - {trade.pair}</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">
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
        </div>
        <footer className="modal-footer">
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
        </footer>
      </form>
    </div>
  );
}
