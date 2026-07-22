import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addScreenshot,
  insertTrade,
  type Educator,
  type RiskManagementPlan,
  type Strategy,
  type TradeResult,
  type TradingAccount,
} from "../../shared/db/database";
import { TradeTargetField } from "./components/TradeTargetField";
import { StrategyInstrumentSelect } from "./components/StrategyInstrumentSelect";
import {
  DraftScreenshotGallery,
  DraftScreenshotImportButton,
  type DraftScreenshot,
} from "./components/ScreenshotTools";
import { deleteScreenshotFile } from "../../shared/db/storage";
import {
  formatCurrencyValue,
  type AppPreferences,
} from "../../shared/appPreferences";
import { ModalShell } from "../../components/ModalShell";
import {
  mergeLinkedStrategies,
  resolveTargetPlan,
  strategyTargetInputs,
} from "./strategyWorkflow";
import {
  calculateRiskAmount,
  currentTimeInputValue,
  defaultRiskPercent,
  formatFormNumber,
  riskPlanMax,
  riskPlanMin,
  riskPlanRangeLabel,
  todayInputValue,
} from "./tradePresentation";

import {
  buildNewTradeSubmission,
  type NewTradeFormState,
} from "./newTradeSubmission";

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
    takeProfits: [""],
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

export function NewTradeWorkflow({
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
      return educator
        ? mergeLinkedStrategies(educator.strategyIds, strategies)
        : null;
    }
    return strategies.find((item) => item.name === form.strategy) ?? null;
  }, [educators, form.strategy, isSystemAccount, strategies]);

  useEffect(() => {
    const pairs = activeStrategy?.currencyPairs ?? [];
    const targetInputs = strategyTargetInputs(activeStrategy);
    setForm((current) => ({
      ...current,
      pair: pairs.includes(current.pair) ? current.pair : (pairs[0] ?? ""),
      stopLoss: targetInputs.stopLoss,
      takeProfits: targetInputs.takeProfits,
    }));
  }, [activeStrategy]);

  const targetPlan = resolveTargetPlan({
    strategy: activeStrategy,
    preferredUnit: appPreferences.tradeTargetUnit,
    instrument: form.pair,
    entryPrice: form.entryPrice,
    direction: form.direction,
    stopLossInput: form.stopLoss,
    takeProfitInputs: form.takeProfits,
  });
  const targetMode = targetPlan.mode;
  const targetUnit = targetPlan.unit;
  const displayedTakeProfitInputs = targetPlan.takeProfits.map(
    (target) => target.input,
  );

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

  function updateTakeProfit(index: number, value: string) {
    update(
      "takeProfits",
      form.takeProfits.map((target, targetIndex) =>
        targetIndex === index ? value : target,
      ),
    );
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
    const submission = buildNewTradeSubmission({
      account,
      form,
      isSystemAccount,
      riskPlan,
      sourceLabel,
      targetPlan,
      tradeSourceCount: tradeSources.length,
    });
    if (!submission.trade) {
      setSaveError(submission.error);
      return;
    }
    setSaveError(null);

    setSaving(true);
    try {
      const savedTrade = await insertTrade(submission.trade);
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
                <span>Instrument</span>
                <StrategyInstrumentSelect
                  value={form.pair}
                  onChange={(value) => update("pair", value)}
                  instruments={activeStrategy?.currencyPairs ?? []}
                  emptyLabel="No instruments added to this strategy"
                  required
                />
              </label>
              <label className="field">
                <span>{sourceLabel}</span>
                <select
                  value={form.strategy}
                  onChange={(event) => {
                    update("strategy", event.target.value);
                    update("keyLevel", "");
                    update("entryCondition", "");
                    update("exitCondition", "");
                  }}
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
                  <span>Instrument</span>
                  <StrategyInstrumentSelect
                    value={form.pair}
                    onChange={(value) => update("pair", value)}
                    instruments={activeStrategy?.currencyPairs ?? []}
                    emptyLabel="No instruments added to linked strategy"
                    required
                  />
                </label>
                <label className="field field-wide">
                  <span>{sourceLabel}</span>
                  <select
                    value={form.strategy}
                    onChange={(event) => {
                      update("strategy", event.target.value);
                      update("keyLevel", "");
                      update("entryCondition", "");
                      update("exitCondition", "");
                    }}
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
            <TradeTargetField
              label="Stop loss"
              kind="stop-loss"
              instrument={form.pair}
              entryPrice={form.entryPrice}
              direction={form.direction}
              unit={targetUnit}
              value={form.stopLoss}
              onChange={(value) => update("stopLoss", value)}
              readOnly={targetMode === "fixed"}
            />
            <div className="workflow-tp-plan field-wide">
              <header>
                <div>
                  <span>Take profits</span>
                  <small>
                    {targetMode === "fixed"
                      ? "Fixed by the selected strategy"
                      : targetMode === "risk-reward"
                        ? `Calculated from SL through 1:${activeStrategy?.riskRewardGoal ?? 1}`
                        : "Custom values for this trade"}
                  </small>
                </div>
                {targetMode === "custom" ? (
                  <button
                    className="secondary-button workflow-add-tp"
                    type="button"
                    onClick={() =>
                      update("takeProfits", [...form.takeProfits, ""])
                    }
                  >
                    <Plus size={14} aria-hidden="true" />
                    Add TP
                  </button>
                ) : null}
              </header>
              <div className="workflow-tp-list">
                {displayedTakeProfitInputs.map((target, index) => (
                  <div className="workflow-tp-row" key={index}>
                    <TradeTargetField
                      label={`TP ${index + 1}${targetMode === "risk-reward" ? ` · ${index + 1}R` : ""}`}
                      kind="take-profit"
                      instrument={form.pair}
                      entryPrice={form.entryPrice}
                      direction={form.direction}
                      unit={targetUnit}
                      value={target}
                      onChange={(value) => updateTakeProfit(index, value)}
                      readOnly={targetMode !== "custom"}
                    />
                    {targetMode === "custom" && form.takeProfits.length > 1 ? (
                      <button
                        className="icon-button workflow-remove-tp"
                        type="button"
                        aria-label={`Remove TP ${index + 1}`}
                        onClick={() =>
                          update(
                            "takeProfits",
                            form.takeProfits.filter(
                              (_value, targetIndex) => targetIndex !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
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

export function WorkflowTemplateSelect({
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

export function ScaleField({ label, value, onChange }: ScaleFieldProps) {
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

export function ScaleBars({ value }: { value: number }) {
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
