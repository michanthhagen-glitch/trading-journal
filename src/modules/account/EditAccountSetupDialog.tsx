import { useState, type FormEvent, type ReactNode } from "react";
import { ModalShell } from "../../components/ModalShell";
import {
  updateRiskManagementPlan,
  updateStrategy,
  updateTradingAccount,
  type AccountType,
  type RiskManagementPlan,
  type Strategy,
  type TradingAccount,
} from "../../shared/db/database";

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD"];

type EditDialogProps = {
  kind: "accounts" | "strategies" | "risk";
  account?: TradingAccount;
  strategy?: Strategy;
  riskPlan?: RiskManagementPlan;
  strategies: Strategy[];
  riskPlans: RiskManagementPlan[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function EditAccountSetupDialog(props: EditDialogProps) {
  if (props.kind === "accounts" && props.account) {
    return <EditAccountDialog {...props} account={props.account} />;
  }
  if (props.kind === "strategies" && props.strategy) {
    return <EditStrategyDialog {...props} strategy={props.strategy} />;
  }
  if (props.kind === "risk" && props.riskPlan) {
    return <EditRiskPlanDialog {...props} riskPlan={props.riskPlan} />;
  }
  return null;
}

function EditAccountDialog({
  account,
  strategies,
  riskPlans,
  onClose,
  onSaved,
}: EditDialogProps & { account: TradingAccount }) {
  const [name, setName] = useState(account.name);
  const [startingBalance, setStartingBalance] = useState(
    String(account.startingBalance),
  );
  const [commission, setCommission] = useState(String(account.commission));
  const [currency, setCurrency] = useState(account.currency);
  const [accountType, setAccountType] = useState(account.accountType);
  const [strategyIds, setStrategyIds] = useState(account.strategyIds);
  const [riskPlanId, setRiskPlanId] = useState(account.riskPlanId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleStrategy(id: string, checked: boolean) {
    setStrategyIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((item) => item !== id),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateTradingAccount(account.id, {
        name,
        startingBalance: startingBalance.trim()
          ? Number(startingBalance)
          : Number.NaN,
        commission: commission.trim() ? Number(commission) : Number.NaN,
        currency,
        accountType,
        strategyIds,
        riskPlanId:
          accountType === "backtesting" ? null : riskPlanId.trim() || null,
      });
      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save account.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title="Edit account"
      subtitle="Update account details and connected plans."
      formId="edit-account-form"
      saving={saving}
      error={error}
      onClose={onClose}
    >
      <form
        id="edit-account-form"
        className="account-create-form"
        onSubmit={handleSubmit}
      >
        <RequiredInput label="Account name" value={name} onChange={setName} />
        <NumberInput
          label="Starting balance"
          value={startingBalance}
          onChange={setStartingBalance}
          min="0"
        />
        <label className="field">
          <span>Currency</span>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <NumberInput
          label="Commission / lot"
          value={commission}
          onChange={setCommission}
          min="0"
          help="Zero is allowed, but this field cannot be blank."
        />
        <label className="field">
          <span>Account type</span>
          <select
            value={accountType}
            onChange={(event) => {
              const next = event.target.value as AccountType;
              setAccountType(next);
              if (next === "backtesting") setRiskPlanId("");
            }}
          >
            <option value="live">Live</option>
            <option value="demo">Demo</option>
            <option value="backtesting">Backtesting</option>
          </select>
        </label>
        <label className="field">
          <span>Risk management plan</span>
          <select
            value={accountType === "backtesting" ? "" : riskPlanId}
            onChange={(event) => setRiskPlanId(event.target.value)}
            disabled={accountType === "backtesting"}
          >
            <option value="">No risk plan</option>
            {riskPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="account-strategy-picker">
          <legend>Strategies</legend>
          {strategies.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={strategyIds.includes(item.id)}
                onChange={(event) =>
                  toggleStrategy(item.id, event.target.checked)
                }
              />
              <span>{item.name}</span>
            </label>
          ))}
        </fieldset>
      </form>
    </EditorShell>
  );
}

function EditStrategyDialog({
  strategy,
  onClose,
  onSaved,
}: EditDialogProps & { strategy: Strategy }) {
  const [name, setName] = useState(strategy.name);
  const [description, setDescription] = useState(strategy.strategy);
  const [entryRules, setEntryRules] = useState(strategy.entryRules);
  const [slTpRules, setSlTpRules] = useState(strategy.slTpRules);
  const [invalidationRules, setInvalidationRules] = useState(
    strategy.invalidationRules,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateStrategy(strategy.id, {
        name,
        strategy: description,
        entryRules,
        slTpRules,
        invalidationRules,
      });
      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save strategy.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      title="Edit strategy"
      subtitle="Update the setup and its rules."
      formId="edit-strategy-form"
      saving={saving}
      error={error}
      onClose={onClose}
    >
      <form
        id="edit-strategy-form"
        className="account-create-form"
        onSubmit={handleSubmit}
      >
        <RequiredInput
          className="field-wide"
          label="Strategy name"
          value={name}
          onChange={setName}
        />
        <TextArea
          label="Strategy"
          value={description}
          onChange={setDescription}
        />
        <TextArea
          label="Entry rules"
          value={entryRules}
          onChange={setEntryRules}
        />
        <TextArea
          label="SL and TP rules"
          value={slTpRules}
          onChange={setSlTpRules}
        />
        <TextArea
          label="Invalidation rules"
          value={invalidationRules}
          onChange={setInvalidationRules}
        />
      </form>
    </EditorShell>
  );
}

type RiskFieldKey =
  | "riskPerTradeMinPercent"
  | "riskPerTradeMaxPercent"
  | "riskPerDayMinPercent"
  | "riskPerDayMidPercent"
  | "riskPerDayMaxPercent"
  | "riskPerWeekMinPercent"
  | "riskPerWeekMaxPercent"
  | "maxTradesPerDay"
  | "maxLosingTradesPerDay"
  | "maxLosingDaysInRow"
  | "dailyGoalMinPercent"
  | "dailyGoalMaxPercent"
  | "weeklyGoalMinPercent"
  | "weeklyGoalMidPercent"
  | "weeklyGoalMaxPercent";

function EditRiskPlanDialog({
  riskPlan,
  onClose,
  onSaved,
}: EditDialogProps & { riskPlan: RiskManagementPlan }) {
  const [name, setName] = useState(riskPlan.name);
  const [notes, setNotes] = useState(riskPlan.notes);
  const [activeTab, setActiveTab] = useState<"risk" | "goal">("risk");
  const [values, setValues] = useState<Record<RiskFieldKey, string>>({
    riskPerTradeMinPercent: String(riskPlan.riskPerTradeMinPercent ?? ""),
    riskPerTradeMaxPercent: String(riskPlan.riskPerTradeMaxPercent ?? ""),
    riskPerDayMinPercent: String(riskPlan.riskPerDayMinPercent ?? ""),
    riskPerDayMidPercent: String(riskPlan.riskPerDayMidPercent ?? ""),
    riskPerDayMaxPercent: String(riskPlan.riskPerDayMaxPercent ?? ""),
    riskPerWeekMinPercent: String(riskPlan.riskPerWeekMinPercent ?? ""),
    riskPerWeekMaxPercent: String(riskPlan.riskPerWeekMaxPercent ?? ""),
    maxTradesPerDay: String(riskPlan.maxTradesPerDay ?? ""),
    maxLosingTradesPerDay: String(riskPlan.maxLosingTradesPerDay ?? ""),
    maxLosingDaysInRow: String(riskPlan.maxLosingDaysInRow ?? ""),
    dailyGoalMinPercent: String(riskPlan.dailyGoalMinPercent ?? ""),
    dailyGoalMaxPercent: String(riskPlan.dailyGoalMaxPercent ?? ""),
    weeklyGoalMinPercent: String(riskPlan.weeklyGoalMinPercent ?? ""),
    weeklyGoalMidPercent: String(riskPlan.weeklyGoalMidPercent ?? ""),
    weeklyGoalMaxPercent: String(riskPlan.weeklyGoalMaxPercent ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setValue(key: RiskFieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function parsed(key: RiskFieldKey) {
    return values[key].trim() ? Number(values[key]) : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateRiskManagementPlan(riskPlan.id, {
        name,
        notes,
        riskPerTradeMinPercent: parsed("riskPerTradeMinPercent"),
        riskPerTradeMaxPercent: parsed("riskPerTradeMaxPercent"),
        riskPerDayMinPercent: parsed("riskPerDayMinPercent"),
        riskPerDayMidPercent: parsed("riskPerDayMidPercent"),
        riskPerDayMaxPercent: parsed("riskPerDayMaxPercent"),
        riskPerWeekMinPercent: parsed("riskPerWeekMinPercent"),
        riskPerWeekMaxPercent: parsed("riskPerWeekMaxPercent"),
        maxTradesPerDay: parsed("maxTradesPerDay"),
        maxLosingTradesPerDay: parsed("maxLosingTradesPerDay"),
        maxLosingDaysInRow: parsed("maxLosingDaysInRow"),
        dailyGoalMinPercent: parsed("dailyGoalMinPercent"),
        dailyGoalMaxPercent: parsed("dailyGoalMaxPercent"),
        weeklyGoalMinPercent: parsed("weeklyGoalMinPercent"),
        weeklyGoalMidPercent: parsed("weeklyGoalMidPercent"),
        weeklyGoalMaxPercent: parsed("weeklyGoalMaxPercent"),
      });
      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save risk plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  const riskFields: Array<[string, RiskFieldKey, boolean?]> = [
    ["Trade min %", "riskPerTradeMinPercent"],
    ["Trade max %", "riskPerTradeMaxPercent"],
    ["Day min %", "riskPerDayMinPercent"],
    ["Day mid %", "riskPerDayMidPercent"],
    ["Day max %", "riskPerDayMaxPercent"],
    ["Week min %", "riskPerWeekMinPercent"],
    ["Week max %", "riskPerWeekMaxPercent"],
    ["Max trades/day", "maxTradesPerDay", true],
    ["Max losing trades/day", "maxLosingTradesPerDay", true],
    ["Max losing days in a row", "maxLosingDaysInRow", true],
  ];
  const goalFields: Array<[string, RiskFieldKey]> = [
    ["Daily goal min %", "dailyGoalMinPercent"],
    ["Daily goal max %", "dailyGoalMaxPercent"],
    ["Weekly goal min %", "weeklyGoalMinPercent"],
    ["Weekly goal mid %", "weeklyGoalMidPercent"],
    ["Weekly goal max %", "weeklyGoalMaxPercent"],
  ];

  return (
    <EditorShell
      title="Edit risk plan"
      subtitle="Every risk and goal value is required and must be above zero."
      formId="edit-risk-form"
      saving={saving}
      error={error}
      onClose={onClose}
    >
      <form
        id="edit-risk-form"
        className="account-create-form risk-create-form"
        onSubmit={handleSubmit}
      >
        <RequiredInput
          className="field-wide"
          label="Risk plan name"
          value={name}
          onChange={setName}
        />
        <div className="tab-bar account-modal-tabs" role="tablist">
          <button
            className={`tab ${activeTab === "risk" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "risk"}
            onClick={() => setActiveTab("risk")}
          >
            Risk
          </button>
          <button
            className={`tab ${activeTab === "goal" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "goal"}
            onClick={() => setActiveTab("goal")}
          >
            Goal
          </button>
        </div>
        <div className="risk-field-grid risk-field-grid-three field-wide">
          {(activeTab === "risk" ? riskFields : goalFields).map(
            ([label, key, integer]) => (
              <NumberInput
                key={key}
                label={label}
                value={values[key]}
                onChange={(value) => setValue(key, value)}
                min={integer ? "1" : "0.01"}
                step={integer ? "1" : "0.01"}
              />
            ),
          )}
        </div>
        <TextArea label="Notes" value={notes} onChange={setNotes} />
      </form>
    </EditorShell>
  );
}

function RequiredInput({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  step = "0.01",
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: string;
  step?: string;
  help?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        required
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field field-wide">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function EditorShell({
  title,
  subtitle,
  formId,
  saving,
  error,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  formId: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ModalShell
      ariaLabel={title}
      modalClassName="account-create-modal"
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      footer={
        <>
          {error ? <p className="modal-save-error">{error}</p> : null}
          <button
            className="ghost-button"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="submit"
            form={formId}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      {children}
    </ModalShell>
  );
}
