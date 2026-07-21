import {
  findInstrumentGroup,
  INSTRUMENT_GROUPS,
  instrumentDisplayName,
} from "../../../shared/tradeInstruments";

export function StrategyInstrumentSelect({
  emptyLabel,
  instruments,
  onChange,
  required = false,
  value,
}: {
  emptyLabel: string;
  instruments: string[];
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const grouped = INSTRUMENT_GROUPS.map((group) => ({
    ...group,
    values: instruments.filter(
      (instrument) => findInstrumentGroup(instrument)?.id === group.id,
    ),
  })).filter((group) => group.values.length > 0);
  const custom = instruments.filter(
    (instrument) => !findInstrumentGroup(instrument),
  );

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={instruments.length === 0}
      required={required}
    >
      {instruments.length === 0 ? <option value="">{emptyLabel}</option> : null}
      {grouped.map((group) => (
        <optgroup key={group.id} label={group.label}>
          {group.values.map((instrument) => (
            <option key={instrument} value={instrument}>
              {instrumentDisplayName(instrument)}
            </option>
          ))}
        </optgroup>
      ))}
      {custom.length > 0 ? (
        <optgroup label="Custom">
          {custom.map((instrument) => (
            <option key={instrument} value={instrument}>
              {instrument}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}
