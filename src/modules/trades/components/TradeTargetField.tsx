import {
  calculateTradeTarget,
  formatTradeTargetPrice,
  formatTradeTargetUnitValue,
  type TradeDirection,
  type TradeTargetKind,
  type TradeTargetUnit,
} from "../../../shared/tradeInstruments";

const UNIT_LABELS: Record<TradeTargetUnit, string> = {
  price: "Price",
  pips: "Pips",
  points: "Points",
  ticks: "Ticks",
};

export function TradeTargetField({
  direction,
  entryPrice,
  kind,
  label,
  onChange,
  instrument,
  required = false,
  unit,
  value,
}: {
  direction: TradeDirection;
  entryPrice: string;
  kind: TradeTargetKind;
  label: string;
  onChange: (value: string) => void;
  instrument: string;
  required?: boolean;
  unit: TradeTargetUnit;
  value: string;
}) {
  const calculation = calculateTradeTarget({
    direction,
    entryPrice,
    entryPriceInput: entryPrice,
    input: value,
    kind,
    instrument,
    unit,
  });
  const needsEntryPrice =
    unit !== "price" && value.trim() && !entryPrice.trim();

  return (
    <label className="field trade-target-field">
      <span>
        {label} ({UNIT_LABELS[unit]})
      </span>
      <input
        type="number"
        step="any"
        min={unit === "price" ? undefined : 0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
      {calculation ? (
        <small className="trade-target-summary">
          Price {formatTradeTargetPrice(calculation)} ·{" "}
          {formatTradeTargetUnitValue(calculation.pips)} pips ·{" "}
          {formatTradeTargetUnitValue(calculation.points)} points ·{" "}
          {formatTradeTargetUnitValue(calculation.ticks)} ticks
        </small>
      ) : needsEntryPrice ? (
        <small>
          Enter the entry price to calculate this {label.toLowerCase()}.
        </small>
      ) : (
        <small>Saved as a price; all units calculate automatically.</small>
      )}
    </label>
  );
}
