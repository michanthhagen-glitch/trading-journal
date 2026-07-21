import { Plus, Trash2 } from "lucide-react";
import { TRADE_TARGET_UNIT_OPTIONS } from "../../shared/appPreferences";
import type { StrategyTargetMode } from "../../shared/db/database";
import type { TradeTargetUnit } from "../../shared/tradeInstruments";

const TARGET_MODES: Array<{
  id: StrategyTargetMode;
  label: string;
  description: string;
}> = [
  {
    id: "fixed",
    label: "Fixed",
    description: "Save the SL and each TP on the strategy.",
  },
  {
    id: "risk-reward",
    label: "Risk / Reward",
    description: "Enter SL in the workflow and calculate every R target.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Enter SL and TPs yourself in each workflow.",
  },
];

export function StrategyTargetPlanField({
  fixedStopLoss,
  fixedTakeProfits,
  mode,
  onFixedStopLossChange,
  onFixedTakeProfitsChange,
  onModeChange,
  onRiskRewardGoalChange,
  riskRewardGoal,
  unit,
}: {
  fixedStopLoss: string;
  fixedTakeProfits: string[];
  mode: StrategyTargetMode;
  onFixedStopLossChange: (value: string) => void;
  onFixedTakeProfitsChange: (values: string[]) => void;
  onModeChange: (mode: StrategyTargetMode) => void;
  onRiskRewardGoalChange: (value: string) => void;
  riskRewardGoal: string;
  unit: TradeTargetUnit;
}) {
  const unitLabel =
    TRADE_TARGET_UNIT_OPTIONS.find((option) => option.value === unit)?.label ??
    "Price";

  function updateTakeProfit(index: number, value: string) {
    onFixedTakeProfitsChange(
      fixedTakeProfits.map((target, targetIndex) =>
        targetIndex === index ? value : target,
      ),
    );
  }

  return (
    <section className="strategy-target-plan field-wide">
      <header>
        <div>
          <h4>SL and TP behavior</h4>
          <p>Choose how this strategy prepares its targets.</p>
        </div>
        <span className="strategy-target-unit">Settings unit: {unitLabel}</span>
      </header>

      <div className="strategy-target-mode-grid">
        {TARGET_MODES.map((option) => (
          <label
            className={`strategy-target-mode ${mode === option.id ? "active" : ""}`}
            key={option.id}
          >
            <input
              type="radio"
              name="strategy-target-mode"
              value={option.id}
              checked={mode === option.id}
              onChange={() => onModeChange(option.id)}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </div>

      {mode === "fixed" ? (
        <div className="strategy-fixed-targets">
          <label className="field">
            <span>Fixed stop loss · {unitLabel}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={fixedStopLoss}
              onChange={(event) => onFixedStopLossChange(event.target.value)}
              required
            />
          </label>
          <div className="strategy-fixed-tp-list">
            {fixedTakeProfits.map((target, index) => (
              <div className="strategy-fixed-tp-row" key={index}>
                <label className="field">
                  <span>
                    Fixed TP {index + 1} · {unitLabel}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={target}
                    onChange={(event) =>
                      updateTakeProfit(index, event.target.value)
                    }
                    required
                  />
                </label>
                {fixedTakeProfits.length > 1 ? (
                  <button
                    className="icon-button strategy-fixed-tp-remove"
                    type="button"
                    aria-label={`Remove fixed TP ${index + 1}`}
                    onClick={() =>
                      onFixedTakeProfitsChange(
                        fixedTakeProfits.filter(
                          (_target, targetIndex) => targetIndex !== index,
                        ),
                      )
                    }
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ))}
            <button
              className="secondary-button strategy-fixed-tp-add"
              type="button"
              onClick={() =>
                onFixedTakeProfitsChange([...fixedTakeProfits, ""])
              }
            >
              <Plus size={14} aria-hidden="true" />
              Add TP
            </button>
          </div>
        </div>
      ) : null}

      {mode === "risk-reward" ? (
        <div className="strategy-rr-targets">
          <label className="field">
            <span>Main RR goal</span>
            <div className="strategy-rr-input">
              <span>1 :</span>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={riskRewardGoal}
                onChange={(event) => onRiskRewardGoalChange(event.target.value)}
                required
              />
            </div>
            <small>
              A 1:{riskRewardGoal || "3"} goal creates TP levels from 1:1
              through 1:{riskRewardGoal || "3"}.
            </small>
          </label>
        </div>
      ) : null}

      {mode === "custom" ? (
        <p className="strategy-custom-target-note">
          The workflow will let you enter SL and add as many TP values as you
          need.
        </p>
      ) : null}
    </section>
  );
}
