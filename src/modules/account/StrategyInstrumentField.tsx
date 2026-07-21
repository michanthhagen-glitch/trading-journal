import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  findInstrumentGroup,
  INSTRUMENT_GROUPS,
  instrumentDisplayName,
  instrumentsWithDraft,
  normalizeInstrumentSymbol,
  type InstrumentGroupId,
} from "../../shared/tradeInstruments";

export function StrategyInstrumentField({
  draft,
  onChange,
  onDraftChange,
  values,
}: {
  draft: string;
  onChange: (values: string[]) => void;
  onDraftChange: (value: string) => void;
  values: string[];
}) {
  const [groupId, setGroupId] = useState<InstrumentGroupId>("forex-major");
  const group =
    INSTRUMENT_GROUPS.find((item) => item.id === groupId) ??
    INSTRUMENT_GROUPS[0];
  const [catalogSymbol, setCatalogSymbol] = useState(
    group.instruments[0]?.symbol ?? "",
  );

  const selectedGroups = useMemo(() => {
    const grouped = INSTRUMENT_GROUPS.map((item) => ({
      id: item.id,
      label: item.label,
      values: values.filter(
        (symbol) => findInstrumentGroup(symbol)?.id === item.id,
      ),
    })).filter((item) => item.values.length > 0);
    const custom = values.filter((symbol) => !findInstrumentGroup(symbol));
    return custom.length
      ? [...grouped, { id: "custom", label: "Custom", values: custom }]
      : grouped;
  }, [values]);

  function addSymbol(symbol: string) {
    const nextValues = instrumentsWithDraft(values, symbol);
    if (nextValues !== values) onChange(nextValues);
  }

  function addCustom() {
    const nextValues = instrumentsWithDraft(values, draft);
    if (nextValues !== values) {
      onChange(nextValues);
      onDraftChange("");
    }
  }

  return (
    <div className="field field-wide strategy-option-field strategy-instrument-field">
      <span>Instruments</span>
      <div className="instrument-library-row">
        <label className="instrument-library-control">
          <span>Market</span>
          <select
            value={groupId}
            onChange={(event) => {
              const nextGroupId = event.target.value as InstrumentGroupId;
              const nextGroup = INSTRUMENT_GROUPS.find(
                (item) => item.id === nextGroupId,
              );
              setGroupId(nextGroupId);
              setCatalogSymbol(nextGroup?.instruments[0]?.symbol ?? "");
            }}
          >
            {INSTRUMENT_GROUPS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="instrument-library-control instrument-library-symbol">
          <span>Instrument</span>
          <select
            value={catalogSymbol}
            onChange={(event) => setCatalogSymbol(event.target.value)}
          >
            {group.instruments.map((instrument) => (
              <option key={instrument.symbol} value={instrument.symbol}>
                {instrument.symbol} · {instrument.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button strategy-option-add-button"
          type="button"
          onClick={() => addSymbol(catalogSymbol)}
          disabled={!catalogSymbol || values.includes(catalogSymbol)}
        >
          <Plus size={14} aria-hidden="true" />
          Add
        </button>
      </div>

      <div className="strategy-option-add-row">
        <input
          value={draft}
          onChange={(event) =>
            onDraftChange(normalizeInstrumentSymbol(event.target.value))
          }
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addCustom();
          }}
          placeholder="Custom broker symbol, e.g. NAS100.cash"
          aria-label="Custom instrument symbol"
        />
        <button
          className="secondary-button strategy-option-add-button"
          type="button"
          onClick={addCustom}
        >
          <Plus size={14} aria-hidden="true" />
          Add custom
        </button>
      </div>

      {selectedGroups.length > 0 ? (
        <div className="instrument-selection-groups">
          {selectedGroups.map((selectedGroup) => (
            <section key={selectedGroup.id}>
              <small>{selectedGroup.label}</small>
              <div className="strategy-option-chips">
                {selectedGroup.values.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() =>
                      onChange(values.filter((item) => item !== symbol))
                    }
                    aria-label={`Remove ${symbol}`}
                    title={instrumentDisplayName(symbol)}
                  >
                    <span>{symbol}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <small>Add the instruments this strategy can trade.</small>
      )}
      <small>
        Built-in values use common quote steps. Broker tick sizes can differ;
        custom symbols use the entered price precision.
      </small>
    </div>
  );
}
