import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ModalShell } from "../../../components/ModalShell";
import type { AppPreferences } from "../../../shared/appPreferences";
import {
  addScreenshot,
  insertTrade,
  type BacktestTarget,
  type NewTrade,
  type Strategy,
  type TradeResult,
  type TradingAccount,
} from "../../../shared/db/database";
import { deleteScreenshotFile } from "../../../shared/db/storage";
import { calculateTradeTarget } from "../../../shared/tradeInstruments";
import {
  DraftScreenshotGallery,
  DraftScreenshotImportButton,
  type DraftScreenshot,
} from "./ScreenshotTools";
import { TradeTargetField } from "./TradeTargetField";
import { StrategyInstrumentSelect } from "./StrategyInstrumentSelect";

type TargetDraft = {
  id: string;
  takeProfit: string;
  result: TradeResult;
};

type LoggerState = {
  tradeDate: string;
  time: string;
  direction: "long" | "short";
  entry: string;
  stopLoss: string;
  keyLevel: string;
  entryCondition: string;
  exitCondition: string;
  targets: TargetDraft[];
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function todayInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function targetId() {
  return `target-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function screenshotId() {
  return `shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function sessionId() {
  return `BT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createLoggerState(tradeDate = todayInputValue()): LoggerState {
  return {
    tradeDate,
    time: "",
    direction: "long",
    entry: "",
    stopLoss: "",
    keyLevel: "",
    entryCondition: "",
    exitCondition: "",
    targets: [{ id: targetId(), takeProfit: "", result: "" }],
  };
}

function targetRr(
  entry: string,
  stopLoss: number | null,
  takeProfit: number | null,
) {
  const entryValue = parseNumber(entry);
  if (entryValue === null || stopLoss === null || takeProfit === null) {
    return null;
  }
  const risk = Math.abs(entryValue - stopLoss);
  if (risk === 0) return null;
  return Math.abs(takeProfit - entryValue) / risk;
}

export function BacktestWorkflow({
  account,
  appPreferences,
  strategies,
  onClose,
  onTradeSaved,
}: {
  account: TradingAccount;
  appPreferences: AppPreferences;
  strategies: Strategy[];
  onClose: () => void;
  onTradeSaved: () => void | Promise<void>;
}) {
  const [phase, setPhase] = useState<"setup" | "logging">("setup");
  const [strategyId, setStrategyId] = useState(strategies[0]?.id ?? "");
  const [pair, setPair] = useState(strategies[0]?.currencyPairs[0] ?? "");
  const [testedAt, setTestedAt] = useState(todayInputValue());
  const [activeSessionId] = useState(sessionId);
  const [logger, setLogger] = useState<LoggerState>(createLoggerState);
  const [beforeScreenshots, setBeforeScreenshots] = useState<DraftScreenshot[]>(
    [],
  );
  const [afterScreenshots, setAfterScreenshots] = useState<DraftScreenshot[]>(
    [],
  );
  const [savedCount, setSavedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strategy = useMemo(
    () => strategies.find((item) => item.id === strategyId) ?? null,
    [strategies, strategyId],
  );

  useEffect(() => {
    const pairs = strategy?.currencyPairs ?? [];
    setPair((current) =>
      pairs.includes(current) ? current : (pairs[0] ?? ""),
    );
  }, [strategy]);

  function update<K extends keyof LoggerState>(key: K, value: LoggerState[K]) {
    setLogger((current) => ({ ...current, [key]: value }));
  }

  function updateTarget(id: string, patch: Partial<TargetDraft>) {
    update(
      "targets",
      logger.targets.map((target) =>
        target.id === id ? { ...target, ...patch } : target,
      ),
    );
  }

  function addDraftScreenshot(stage: "pre-trade" | "exit", path: string) {
    const screenshot: DraftScreenshot = {
      id: screenshotId(),
      stage,
      path,
      caption: "",
    };
    if (stage === "pre-trade") {
      setBeforeScreenshots((current) => [...current, screenshot]);
    } else {
      setAfterScreenshots((current) => [...current, screenshot]);
    }
  }

  async function removeScreenshot(stage: "pre-trade" | "exit", id: string) {
    const screenshots =
      stage === "pre-trade" ? beforeScreenshots : afterScreenshots;
    const screenshot = screenshots.find((item) => item.id === id);
    if (screenshot) await deleteScreenshotFile(screenshot.path);
    if (stage === "pre-trade") {
      setBeforeScreenshots((current) =>
        current.filter((item) => item.id !== id),
      );
    } else {
      setAfterScreenshots((current) =>
        current.filter((item) => item.id !== id),
      );
    }
  }

  async function discardScreenshots() {
    for (const screenshot of [...beforeScreenshots, ...afterScreenshots]) {
      try {
        await deleteScreenshotFile(screenshot.path);
      } catch (deleteError) {
        console.error(deleteError);
      }
    }
  }

  async function closeWorkflow() {
    await discardScreenshots();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (phase === "setup") {
      if (!strategy) {
        setError("Select a strategy.");
        return;
      }
      if (!pair.trim()) {
        setError("Instrument is required.");
        return;
      }
      if (!testedAt) {
        setError("Date of backtesting is required.");
        return;
      }
      setPhase("logging");
      return;
    }

    const entry = parseNumber(logger.entry);
    const stopLossCalculation = calculateTradeTarget({
      instrument: pair,
      entryPrice: logger.entry,
      entryPriceInput: logger.entry,
      direction: logger.direction,
      kind: "stop-loss",
      unit: appPreferences.tradeTargetUnit,
      input: logger.stopLoss,
    });
    const targets: BacktestTarget[] = logger.targets.map((target) => ({
      takeProfit:
        calculateTradeTarget({
          instrument: pair,
          entryPrice: logger.entry,
          entryPriceInput: logger.entry,
          direction: logger.direction,
          kind: "take-profit",
          unit: appPreferences.tradeTargetUnit,
          input: target.takeProfit,
        })?.price ?? null,
      result: target.result,
    }));
    if (!logger.tradeDate || !logger.time) {
      setError("Trade date and time are required.");
      return;
    }
    if (entry === null || stopLossCalculation === null) {
      setError("Entry and stop loss are required.");
      return;
    }
    if (targets.some((target) => target.takeProfit === null)) {
      setError("Add a value for every take profit.");
      return;
    }

    const firstTarget = targets[0];
    const newTrade: NewTrade = {
      accountId: account.id,
      date: logger.tradeDate,
      pair: pair.toUpperCase().trim(),
      direction: logger.direction,
      preTrade: {
        strategy: strategy?.name ?? "",
        keyLevel: logger.keyLevel,
        entryCondition: logger.entryCondition,
        riskPercent: null,
        riskAmount: null,
        bias: "",
        notes: "",
        feeling: null,
      },
      entry: {
        time: logger.time,
        price: entry,
        lotSize: null,
        stopLoss: stopLossCalculation.price,
        takeProfit: firstTarget?.takeProfit ?? null,
        notes: "",
        confidence: null,
      },
      exit: {
        price: null,
        result: firstTarget?.result ?? "",
        note: "",
        feeling: null,
        time: null,
        exitCondition: logger.exitCondition,
      },
      pnl: null,
      backtestSessionId: activeSessionId,
      backtestTestedAt: testedAt,
      backtestTargets: targets,
    };

    setSaving(true);
    try {
      const savedTrade = await insertTrade(newTrade);
      for (const screenshot of [...beforeScreenshots, ...afterScreenshots]) {
        await addScreenshot(
          savedTrade.id,
          screenshot.stage,
          screenshot.path,
          screenshot.caption,
        );
      }
      setBeforeScreenshots([]);
      setAfterScreenshots([]);
      setSavedCount((count) => count + 1);
      setLogger((current) => createLoggerState(current.tradeDate));
      await onTradeSaved();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save this backtest trade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel="Backtest session"
      modalClassName="backtest-modal-card"
      onClose={closeWorkflow}
      onSubmit={handleSubmit}
      title={phase === "setup" ? "New backtest" : "Rapid trade logging"}
      subtitle={
        phase === "setup"
          ? account.name
          : `${strategy?.name ?? "Strategy"} / ${pair.toUpperCase()} / ${testedAt}`
      }
      footer={
        <>
          {error ? (
            <p className="modal-save-error" role="alert">
              {error}
            </p>
          ) : null}
          {phase === "logging" && savedCount > 0 ? (
            <span className="backtest-saved-count">{savedCount} saved</span>
          ) : null}
          <button
            className="ghost-button"
            type="button"
            onClick={closeWorkflow}
            disabled={saving}
          >
            {phase === "setup" ? "Cancel" : "Finish session"}
          </button>
          <button className="primary-button" type="submit" disabled={saving}>
            {phase === "setup"
              ? "Start backtesting"
              : saving
                ? "Saving..."
                : "Save & add next"}
          </button>
        </>
      }
    >
      {phase === "setup" ? (
        <div className="backtest-setup-grid">
          <label className="field">
            <span>Strategy</span>
            <select
              value={strategyId}
              onChange={(event) => setStrategyId(event.target.value)}
              disabled={strategies.length === 0}
            >
              {strategies.length === 0 ? (
                <option value="">No linked strategies</option>
              ) : (
                strategies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="field">
            <span>Instrument</span>
            <StrategyInstrumentSelect
              value={pair}
              onChange={setPair}
              instruments={strategy?.currencyPairs ?? []}
              emptyLabel="No instruments added to this strategy"
              required
            />
          </label>
          <label className="field">
            <span>Date of backtesting</span>
            <input
              type="date"
              value={testedAt}
              onChange={(event) => setTestedAt(event.target.value)}
              required
            />
          </label>
        </div>
      ) : (
        <div className="backtest-logger">
          <section className="backtest-logger-section">
            <header>
              <h4>Trade</h4>
              <span>Historical execution</span>
            </header>
            <div className="backtest-trade-grid">
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={logger.tradeDate}
                  onChange={(event) => update("tradeDate", event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Time</span>
                <input
                  type="time"
                  value={logger.time}
                  onChange={(event) => update("time", event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Buy or sell</span>
                <select
                  value={logger.direction}
                  onChange={(event) =>
                    update(
                      "direction",
                      event.target.value as LoggerState["direction"],
                    )
                  }
                >
                  <option value="long">Buy</option>
                  <option value="short">Sell</option>
                </select>
              </label>
              <label className="field">
                <span>Entry</span>
                <input
                  type="number"
                  step="any"
                  value={logger.entry}
                  onChange={(event) => update("entry", event.target.value)}
                  required
                />
              </label>
              <TradeTargetField
                label="Stop loss"
                kind="stop-loss"
                instrument={pair}
                entryPrice={logger.entry}
                direction={logger.direction}
                unit={appPreferences.tradeTargetUnit}
                value={logger.stopLoss}
                onChange={(value) => update("stopLoss", value)}
                required
              />
              <TemplateSelect
                label="Key level"
                options={strategy?.keyLevels ?? []}
                value={logger.keyLevel}
                onChange={(value) => update("keyLevel", value)}
              />
              <TemplateSelect
                label="Entry condition"
                options={strategy?.entryConditions ?? []}
                value={logger.entryCondition}
                onChange={(value) => update("entryCondition", value)}
              />
              <TemplateSelect
                label="Exit condition"
                options={strategy?.exitConditions ?? []}
                value={logger.exitCondition}
                onChange={(value) => update("exitCondition", value)}
              />
            </div>
          </section>

          <section className="backtest-logger-section backtest-target-section">
            <header>
              <div>
                <h4>Targets and results</h4>
                <span>Compare more than one take profit</span>
              </div>
              <button
                className="secondary-button backtest-add-target"
                type="button"
                onClick={() =>
                  update("targets", [
                    ...logger.targets,
                    { id: targetId(), takeProfit: "", result: "" },
                  ])
                }
              >
                <Plus size={14} aria-hidden="true" />
                Add TP
              </button>
            </header>
            <div className="backtest-target-list">
              {logger.targets.map((target, index) => {
                const stopLoss =
                  calculateTradeTarget({
                    instrument: pair,
                    entryPrice: logger.entry,
                    entryPriceInput: logger.entry,
                    direction: logger.direction,
                    kind: "stop-loss",
                    unit: appPreferences.tradeTargetUnit,
                    input: logger.stopLoss,
                  })?.price ?? null;
                const takeProfit =
                  calculateTradeTarget({
                    instrument: pair,
                    entryPrice: logger.entry,
                    entryPriceInput: logger.entry,
                    direction: logger.direction,
                    kind: "take-profit",
                    unit: appPreferences.tradeTargetUnit,
                    input: target.takeProfit,
                  })?.price ?? null;
                const rr = targetRr(logger.entry, stopLoss, takeProfit);
                return (
                  <div className="backtest-target-row" key={target.id}>
                    <TradeTargetField
                      label={`TP ${index + 1}`}
                      kind="take-profit"
                      instrument={pair}
                      entryPrice={logger.entry}
                      direction={logger.direction}
                      unit={appPreferences.tradeTargetUnit}
                      value={target.takeProfit}
                      onChange={(value) =>
                        updateTarget(target.id, { takeProfit: value })
                      }
                      required
                    />
                    <div className="backtest-rr-value">
                      <span>RR</span>
                      <strong>{rr === null ? "—" : `${rr.toFixed(2)}R`}</strong>
                    </div>
                    <label className="field">
                      <span>Result</span>
                      <select
                        value={target.result}
                        onChange={(event) =>
                          updateTarget(target.id, {
                            result: event.target.value as TradeResult,
                          })
                        }
                      >
                        <option value="">Not tested</option>
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                        <option value="break-even">Break-even</option>
                      </select>
                    </label>
                    {logger.targets.length > 1 ? (
                      <button
                        className="icon-button backtest-remove-target"
                        type="button"
                        onClick={() =>
                          update(
                            "targets",
                            logger.targets.filter(
                              (item) => item.id !== target.id,
                            ),
                          )
                        }
                        aria-label={`Remove TP ${index + 1}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="backtest-screenshot-grid">
            <ScreenshotField
              label="Before screenshot"
              stage="pre-trade"
              screenshots={beforeScreenshots}
              confirmBeforeDelete={appPreferences.confirmBeforeDelete}
              onImported={(path) => addDraftScreenshot("pre-trade", path)}
              onDelete={(id) => removeScreenshot("pre-trade", id)}
            />
            <ScreenshotField
              label="After screenshot"
              stage="exit"
              screenshots={afterScreenshots}
              confirmBeforeDelete={appPreferences.confirmBeforeDelete}
              onImported={(path) => addDraftScreenshot("exit", path)}
              onDelete={(id) => removeScreenshot("exit", id)}
            />
          </section>
        </div>
      )}
    </ModalShell>
  );
}

function TemplateSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={options.length === 0}
      >
        <option value="">
          {options.length > 0 ? "None" : `No ${label.toLowerCase()} options`}
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

function ScreenshotField({
  confirmBeforeDelete,
  label,
  onDelete,
  onImported,
  screenshots,
  stage,
}: {
  confirmBeforeDelete: boolean;
  label: string;
  onDelete: (id: string) => void | Promise<void>;
  onImported: (path: string) => void | Promise<void>;
  screenshots: DraftScreenshot[];
  stage: "pre-trade" | "exit";
}) {
  return (
    <div className="backtest-screenshot-field">
      <header>
        <span>{label}</span>
        <DraftScreenshotImportButton stage={stage} onImported={onImported} />
      </header>
      {screenshots.length > 0 ? (
        <DraftScreenshotGallery
          confirmBeforeDelete={confirmBeforeDelete}
          screenshots={screenshots}
          onDelete={onDelete}
        />
      ) : (
        <p>No screenshot added.</p>
      )}
    </div>
  );
}
