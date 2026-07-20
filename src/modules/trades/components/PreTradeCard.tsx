import { type Trade } from "../../../shared/db/database";
import {
  formatCurrencyValue,
  type AppPreferences,
} from "../../../shared/appPreferences";
import { TradeScreenshotGallery } from "./ScreenshotTools";

type PreTradeCardProps = {
  appPreferences: AppPreferences;
  currency: string;
  sourceLabel: string;
  trade: Trade;
  onEdit: () => void;
  onChanged: () => void | Promise<void>;
};

export function PreTradeCard({
  appPreferences,
  currency,
  sourceLabel,
  trade,
  onEdit,
  onChanged,
}: PreTradeCardProps) {
  const pre = trade.preTrade;
  const screenshots = trade.screenshots.filter((s) => s.stage === "pre-trade");
  const hasContent =
    pre.strategy ||
    pre.keyLevel ||
    pre.entryCondition ||
    pre.riskPercent != null ||
    pre.riskAmount != null ||
    pre.bias ||
    pre.notes ||
    pre.feeling != null ||
    screenshots.length > 0;

  return (
    <article className="trade-card trade-card-pre">
      <header className="trade-card-header">
        <span className="stage-dot stage-pre" aria-hidden="true" />
        <h3>Pre-trade</h3>
        <div className="trade-card-actions">
          <button
            className="ghost-button ghost-button-sm"
            type="button"
            onClick={onEdit}
          >
            {hasContent ? "Edit" : "Fill in"}
          </button>
        </div>
      </header>

      {!hasContent ? (
        <p className="pre-empty">
          No pre-trade analysis yet. Capture the market state before you enter.
        </p>
      ) : (
        <div className="pre-content">
          <dl className="trade-card-body">
            <div className="trade-card-fields">
              <div>
                <dt>{sourceLabel}</dt>
                <dd>{pre.strategy || "—"}</dd>
              </div>
              <div>
                <dt>Risk %</dt>
                <dd>{pre.riskPercent != null ? `${pre.riskPercent}%` : "—"}</dd>
              </div>
              <div>
                <dt>Risk amount</dt>
                <dd>
                  {pre.riskAmount != null
                    ? formatCurrencyValue(
                        pre.riskAmount,
                        currency,
                        appPreferences,
                      )
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Bias</dt>
                <dd>{pre.bias || "—"}</dd>
              </div>
              <div>
                <dt>Key level</dt>
                <dd>{pre.keyLevel || "—"}</dd>
              </div>
              <div>
                <dt>Entry condition</dt>
                <dd>{pre.entryCondition || "—"}</dd>
              </div>
            </div>
            <div className="trade-card-note">
              <dt>Setup notes</dt>
              <dd>{pre.notes || "No notes yet."}</dd>
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
            {pre.feeling != null ? (
              <FeelingDisplay value={pre.feeling} />
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

function FeelingDisplay({ value }: { value: number }) {
  return (
    <div className="feeling-display">
      <div className="feeling-meta">
        <span className="feeling-label">Feeling before trade</span>
        <span className="feeling-value">{value}/10</span>
      </div>
      <div className="feeling-bar" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`feeling-cell ${i < value ? "filled" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
