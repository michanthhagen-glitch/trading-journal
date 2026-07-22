import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  closeTrade,
  saveEntry,
  savePreTrade,
  type EntryData,
  type ExitData,
  type Strategy,
  type Trade,
  type TradeResult,
  type TradingAccount,
} from "../../shared/db/database";
import { PreTradeCard } from "./components/PreTradeCard";
import { PreTradeForm } from "./components/PreTradeForm";
import { TradeTargetField } from "./components/TradeTargetField";
import {
  TradeScreenshotDropZone,
  TradeScreenshotGallery,
} from "./components/ScreenshotTools";
import {
  formatDateValue,
  formatTimeForDateValue,
  type AppPreferences,
} from "../../shared/appPreferences";
import { ModalShell } from "../../components/ModalShell";
import {
  calculateTradeTarget,
  tradeTargetInputFromPrice,
} from "../../shared/tradeInstruments";
import { parseTradeNumber as parseNumber } from "./strategyWorkflow";
import {
  actualRiskReward,
  currentTimeInputValue,
  displayTakeProfits,
  fmtMoney,
  fmtPercent,
  fmtPnl,
  fmtPrice,
  fmtRMultiple,
  plannedRiskReward,
  pnlToneClass,
  resultLabel,
  tradeBalanceSummary,
  tradeDuration,
  tradeSourceLabel,
} from "./tradePresentation";
import {
  ScaleBars,
  ScaleField,
  WorkflowTemplateSelect,
} from "./NewTradeWorkflow";

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

export function TradeDetail({
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

export function TradeSummaryStrip({
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

export function SummaryMetric({
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
    entry.takeProfits.length > 0 ||
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
            <dt>Take profits</dt>
            <dd>
              {displayTakeProfits(entry).length > 0
                ? displayTakeProfits(entry)
                    .map(
                      (target, index) => `TP ${index + 1}: ${fmtPrice(target)}`,
                    )
                    .join(" · ")
                : "—"}
            </dd>
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
  const [form, setForm] = useState(() => {
    const price = trade.entry.price?.toString() ?? "";
    return {
      strategy: trade.preTrade.strategy,
      keyLevel: trade.preTrade.keyLevel,
      entryCondition: trade.preTrade.entryCondition,
      direction: trade.direction,
      time: trade.entry.time ?? currentTimeInputValue(),
      price,
      lotSize: trade.entry.lotSize?.toString() ?? "",
      stopLoss: tradeTargetInputFromPrice({
        instrument: trade.pair,
        entryPrice: price,
        entryPriceInput: price,
        targetPrice: trade.entry.stopLoss,
        unit: appPreferences.tradeTargetUnit,
      }),
      takeProfits: (() => {
        const targets = displayTakeProfits(trade.entry);
        return (targets.length > 0 ? targets : [null]).map((targetPrice) =>
          tradeTargetInputFromPrice({
            instrument: trade.pair,
            entryPrice: price,
            entryPriceInput: price,
            targetPrice,
            unit: appPreferences.tradeTargetUnit,
          }),
        );
      })(),
      notes: trade.entry.notes,
      confidence: trade.entry.confidence ?? 5,
    };
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const stopLossCalculation = form.stopLoss.trim()
      ? calculateTradeTarget({
          instrument: trade.pair,
          entryPrice: form.price,
          entryPriceInput: form.price,
          direction: form.direction,
          kind: "stop-loss",
          unit: appPreferences.tradeTargetUnit,
          input: form.stopLoss,
        })
      : null;
    const takeProfitCalculations = form.takeProfits
      .filter((value) => value.trim())
      .map((input) =>
        calculateTradeTarget({
          instrument: trade.pair,
          entryPrice: form.price,
          entryPriceInput: form.price,
          direction: form.direction,
          kind: "take-profit",
          unit: appPreferences.tradeTargetUnit,
          input,
        }),
      );
    if (
      (form.stopLoss.trim() && !stopLossCalculation) ||
      takeProfitCalculations.some((calculation) => !calculation)
    ) {
      setSaveError("Enter a valid entry price to calculate SL and TP.");
      return;
    }
    setSaveError(null);
    const takeProfitPrices = takeProfitCalculations.flatMap((calculation) =>
      calculation ? [calculation.price] : [],
    );
    const entry: EntryData = {
      time: form.time || null,
      price: parseNumber(form.price),
      lotSize: parseNumber(form.lotSize),
      stopLoss: stopLossCalculation?.price ?? null,
      takeProfit:
        takeProfitPrices.length > 0
          ? takeProfitPrices[takeProfitPrices.length - 1]
          : null,
      takeProfits: takeProfitPrices,
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
          {saveError ? (
            <p className="modal-save-error" role="alert">
              {saveError}
            </p>
          ) : null}
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
          <TradeTargetField
            label="Stop loss"
            kind="stop-loss"
            instrument={trade.pair}
            entryPrice={form.price}
            direction={form.direction}
            unit={appPreferences.tradeTargetUnit}
            value={form.stopLoss}
            onChange={(value) => update("stopLoss", value)}
          />
          <div className="workflow-tp-plan field-wide">
            <header>
              <div>
                <span>Take profits</span>
                <small>Edit the saved targets for this trade</small>
              </div>
              <button
                className="secondary-button workflow-add-tp"
                type="button"
                onClick={() => update("takeProfits", [...form.takeProfits, ""])}
              >
                <Plus size={14} aria-hidden="true" />
                Add TP
              </button>
            </header>
            <div className="workflow-tp-list">
              {form.takeProfits.map((target, index) => (
                <div className="workflow-tp-row" key={index}>
                  <TradeTargetField
                    label={`TP ${index + 1}`}
                    kind="take-profit"
                    instrument={trade.pair}
                    entryPrice={form.price}
                    direction={form.direction}
                    unit={appPreferences.tradeTargetUnit}
                    value={target}
                    onChange={(value) =>
                      update(
                        "takeProfits",
                        form.takeProfits.map((current, targetIndex) =>
                          targetIndex === index ? value : current,
                        ),
                      )
                    }
                  />
                  {form.takeProfits.length > 1 ? (
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
