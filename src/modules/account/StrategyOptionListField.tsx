import { Plus, X } from "lucide-react";
import { strategyOptionsWithDraft } from "./strategyOptions";

export function StrategyOptionListField({
  label,
  placeholder,
  values,
  onChange,
  draft,
  onDraftChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  function addValue() {
    const nextValues = strategyOptionsWithDraft(values, draft);
    if (nextValues !== values) onChange(nextValues);
    onDraftChange("");
  }

  return (
    <div className="field field-wide strategy-option-field">
      <span>{label}</span>
      <div className="strategy-option-add-row">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addValue();
          }}
          placeholder={placeholder}
        />
        <button
          className="secondary-button strategy-option-add-button"
          type="button"
          onClick={addValue}
        >
          <Plus size={14} aria-hidden="true" />
          Add
        </button>
      </div>
      {values.length > 0 ? (
        <div className="strategy-option-chips">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(values.filter((item) => item !== value))}
              aria-label={`Remove ${value}`}
            >
              <span>{value}</span>
              <X size={12} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <small>Add the choices you want available while journaling.</small>
      )}
    </div>
  );
}
