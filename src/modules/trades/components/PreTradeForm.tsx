import { ClipboardPaste, FileUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addScreenshot,
  savePreTrade,
  type PreTradeData,
  type ScreenshotRow,
  type Trade,
} from "../../../shared/db/database";
import {
  importScreenshotFromClipboard,
  importScreenshotFromPath,
  resolveScreenshotUrl,
} from "../../../shared/db/storage";

type PreTradeFormProps = {
  trade: Trade;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const EMPTY_FORM: PreTradeData = {
  strategy: "",
  riskPercent: null,
  riskAmount: null,
  bias: "",
  notes: "",
  feeling: null,
};

export function PreTradeForm({ trade, onClose, onSaved }: PreTradeFormProps) {
  const [form, setForm] = useState<PreTradeData>(EMPTY_FORM);
  const [screenshots, setScreenshots] = useState<ScreenshotRow[]>(
    trade.screenshots.filter((s) => s.stage === "pre-trade"),
  );
  const [saving, setSaving] = useState(false);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      strategy: trade.preTrade.strategy ?? "",
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

  async function handlePasteFromClipboard() {
    setBusyMsg("Reading clipboard…");
    try {
      const relPath = await importScreenshotFromClipboard();
      if (!relPath) {
        setBusyMsg("No image found on clipboard.");
        setTimeout(() => setBusyMsg(null), 2500);
        return;
      }
      const row = await addScreenshot(trade.id, "pre-trade", relPath);
      setScreenshots((cur) => [...cur, row]);
      setBusyMsg(null);
    } catch (err) {
      console.error(err);
      setBusyMsg("Could not read clipboard image.");
      setTimeout(() => setBusyMsg(null), 2500);
    }
  }

  async function handleImportFromDisk() {
    setBusyMsg(null);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
      });
      if (!picked || typeof picked !== "string") return;
      const relPath = await importScreenshotFromPath(picked);
      const row = await addScreenshot(trade.id, "pre-trade", relPath);
      setScreenshots((cur) => [...cur, row]);
    } catch (err) {
      console.error(err);
      setBusyMsg("Could not import the file.");
      setTimeout(() => setBusyMsg(null), 2500);
    }
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
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Pre-trade analysis"
      onClick={onClose}
    >
      <form
        className="modal-card modal-card-wide"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="modal-header">
          <h3>Pre-trade — {trade.pair}</h3>
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
          <section className="pre-section">
            <header className="pre-section-header">
              <h4>Screenshots</h4>
              <div className="pre-screenshot-actions">
                <button
                  type="button"
                  className="ghost-button ghost-button-sm"
                  onClick={handlePasteFromClipboard}
                >
                  <ClipboardPaste size={14} aria-hidden="true" />
                  <span>Paste from clipboard</span>
                </button>
                <button
                  type="button"
                  className="ghost-button ghost-button-sm"
                  onClick={handleImportFromDisk}
                >
                  <FileUp size={14} aria-hidden="true" />
                  <span>Import from disk</span>
                </button>
              </div>
            </header>
            {screenshots.length === 0 ? (
              <p className="pre-empty">
                No screenshots yet — paste a TradingView chart or import from
                disk.
              </p>
            ) : (
              <ScreenshotStrip screenshots={screenshots} />
            )}
            {busyMsg ? <p className="pre-status">{busyMsg}</p> : null}
          </section>

          <section className="pre-section">
            <header className="pre-section-header">
              <h4>Market analysis</h4>
            </header>
            <div className="form-grid">
              <label className="field field-wide">
                <span>Strategy</span>
                <input
                  type="text"
                  value={form.strategy}
                  onChange={(e) => update("strategy", e.target.value)}
                  placeholder="Mock strategy for now"
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
            {saving ? "Saving…" : "Save pre-trade"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ScreenshotStrip({ screenshots }: { screenshots: ScreenshotRow[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      screenshots.map(async (s) => [s.id, await resolveScreenshotUrl(s.path)]),
    ).then((pairs) => {
      if (cancelled) return;
      setUrls(Object.fromEntries(pairs as [string, string][]));
    });
    return () => {
      cancelled = true;
    };
  }, [screenshots]);
  return (
    <div className="screenshot-strip">
      {screenshots.map((s) => (
        <div className="screenshot-thumb" key={s.id}>
          {urls[s.id] ? (
            <img src={urls[s.id]} alt={s.caption || "Screenshot"} />
          ) : (
            <span className="screenshot-loading">…</span>
          )}
        </div>
      ))}
    </div>
  );
}
