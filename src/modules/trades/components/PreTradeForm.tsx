import { useEffect, useState } from "react";
import { ModalShell } from "../../../components/ModalShell";
import {
  savePreTrade,
  type PreTradeData,
  type Strategy,
  type Trade,
} from "../../../shared/db/database";
import { TradeScreenshotDropZone } from "./ScreenshotTools";

type PreTradeFormProps = {
  confirmBeforeDelete: boolean;
  trade: Trade;
  tradeName: string;
  sourceLabel: string;
  strategyTemplate: Strategy | null;
  onChanged: () => void | Promise<void>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const EMPTY_FORM: PreTradeData = {
  strategy: "",
  keyLevel: "",
  entryCondition: "",
  riskPercent: null,
  riskAmount: null,
  bias: "",
  notes: "",
  feeling: null,
};

export function PreTradeForm({
  confirmBeforeDelete,
  trade,
  tradeName,
  sourceLabel,
  strategyTemplate,
  onChanged,
  onClose,
  onSaved,
}: PreTradeFormProps) {
  const [form, setForm] = useState<PreTradeData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      strategy: trade.preTrade.strategy ?? "",
      keyLevel: trade.preTrade.keyLevel ?? "",
      entryCondition: trade.preTrade.entryCondition ?? "",
      riskPercent: trade.preTrade.riskPercent,
      riskAmount: trade.preTrade.riskAmount,
      bias: trade.preTrade.bias ?? "",
      notes: trade.preTrade.notes ?? "",
      feeling: trade.preTrade.feeling ?? null,
    });
  }, [trade.id]);

  function update<K extends keyof PreTradeData>(
    key: K,
    value: PreTradeData[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await savePreTrade(trade.id, form);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel="Pre-trade analysis"
      modalClassName="modal-card-wide"
      onClose={onClose}
      onSubmit={handleSubmit}
      title={`Pre-trade - ${tradeName}`}
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
            {saving ? "Saving…" : "Save pre-trade"}
          </button>
        </>
      }
    >
      <section className="pre-section">
        <header className="pre-section-header">
          <h4>Screenshots</h4>
        </header>
        <TradeScreenshotDropZone
          confirmBeforeDelete={confirmBeforeDelete}
          screenshots={trade.screenshots.filter((s) => s.stage === "pre-trade")}
          stage="pre-trade"
          tradeId={trade.id}
          onChanged={onChanged}
        />
      </section>

      <section className="pre-section">
        <header className="pre-section-header">
          <h4>Market analysis</h4>
        </header>
        <div className="form-grid">
          <label className="field field-wide">
            <span>{sourceLabel}</span>
            <input
              type="text"
              value={form.strategy}
              onChange={(e) => update("strategy", e.target.value)}
              placeholder={`Select or enter the ${sourceLabel.toLowerCase()}`}
            />
          </label>
          <label className="field">
            <span>Risk %</span>
            <input
              type="number"
              step="any"
              value={form.riskPercent ?? ""}
              onChange={(e) =>
                update(
                  "riskPercent",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              placeholder="1"
            />
          </label>
          <label className="field">
            <span>Risk amount</span>
            <input
              type="number"
              step="any"
              value={form.riskAmount ?? ""}
              onChange={(e) =>
                update(
                  "riskAmount",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              placeholder="100"
            />
          </label>
          <label className="field">
            <span>Bias</span>
            <input
              type="text"
              value={form.bias}
              onChange={(e) => update("bias", e.target.value)}
              placeholder="Long / Short / Neutral"
            />
          </label>
          <TemplateSelect
            label="Key level"
            options={strategyTemplate?.keyLevels ?? []}
            value={form.keyLevel}
            onChange={(value) => update("keyLevel", value)}
          />
          <TemplateSelect
            label="Entry condition"
            options={strategyTemplate?.entryConditions ?? []}
            value={form.entryCondition}
            onChange={(value) => update("entryCondition", value)}
          />
          <label className="field field-wide">
            <span>Setup notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything else worth remembering"
            />
          </label>
        </div>
      </section>

      <section className="pre-section">
        <header className="pre-section-header">
          <h4>Feeling before trade</h4>
          <span className="pre-feeling-value">
            {form.feeling != null ? `${form.feeling}/10` : "—"}
          </span>
        </header>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={form.feeling ?? 5}
          onChange={(e) => update("feeling", Number(e.target.value))}
          className="feeling-slider"
          aria-label="Pre-trade feeling"
        />
        <div className="feeling-bar feeling-bar-large" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={`feeling-cell ${form.feeling != null && i < form.feeling ? "filled" : ""}`}
            />
          ))}
        </div>
      </section>
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
