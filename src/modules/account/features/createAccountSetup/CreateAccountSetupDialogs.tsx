import { type FormEvent, type ReactNode, useState } from "react";
import { ModalShell } from "../../../../components/ModalShell";
import {
  createRiskManagementPlan,
  createStrategy,
  createTradingAccount,
  type AccountType,
  type RiskManagementPlan,
  type Strategy,
} from "../../../../shared/db/database";

export type AccountSetupCreateKind = "accounts" | "strategies" | "risk";
type RiskCreateTab = "risk" | "goal";

const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "demo", label: "Demo" },
  { id: "backtesting", label: "Backtesting" },
];

const CURRENCIES = [
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "JPY", label: "¥ JPY" },
  { code: "CHF", label: "CHF" },
  { code: "CAD", label: "CAD" },
  { code: "AUD", label: "AUD" },
  { code: "NZD", label: "NZD" },
];

type CreateDialogProps = {
  kind: AccountSetupCreateKind;
  strategies: Strategy[];
  riskPlans: RiskManagementPlan[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

export function CreateAccountSetupDialog({
  kind,
  strategies,
  riskPlans,
  onClose,
  onCreated,
}: CreateDialogProps) {
  if (kind === "accounts") {
    return (
      <CreateAccountDialog
        strategies={strategies}
        riskPlans={riskPlans}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
  }

  if (kind === "strategies") {
    return <CreateStrategyDialog onClose={onClose} onCreated={onCreated} />;
  }

  return <CreateRiskDialog onClose={onClose} onCreated={onCreated} />;
}

function CreateAccountDialog({
  strategies,
  riskPlans,
  onClose,
  onCreated,
}: {
  strategies: Strategy[];
  riskPlans: RiskManagementPlan[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [startingBalance, setStartingBalance] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [commission, setCommission] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("demo");
  const [strategyIds, setStrategyIds] = useState<string[]>(
    strategies[0] ? [strategies[0].id] : [],
  );
  const [riskPlanId, setRiskPlanId] = useState(riskPlans[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleStrategy(strategyId: string, checked: boolean) {
    setStrategyIds((current) =>
      checked
        ? Array.from(new Set([...current, strategyId]))
        : current.filter((id) => id !== strategyId),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const balance = startingBalance.trim()
      ? Number(startingBalance)
      : Number.NaN;
    const commissionPerLot = commission.trim() ? Number(commission) : 0;

    try {
      await createTradingAccount({
        name,
        startingBalance: balance,
        commission: commissionPerLot,
        currency,
        accountType,
        strategyIds,
        riskPlanId:
          accountType === "backtesting" ? null : riskPlanId.trim() || null,
      });
      await onCreated();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create account.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <CreateModalShell
      title="Create account"
      subtitle="Account details and connected plans."
      formId="create-account-form"
      submitLabel="Create account"
      saving={saving}
      error={error}
      onClose={onClose}
    >
      <form
        id="create-account-form"
        className="account-create-form"
        onSubmit={handleSubmit}
      >
        <label className="field">
          <span>Account name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Main live account"
          />
        </label>

        <label className="field">
          <span>Starting balance</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={startingBalance}
            onChange={(event) => setStartingBalance(event.target.value)}
            placeholder="10000"
          />
        </label>

        <label className="field">
          <span>Currency</span>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Commission / lot</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
            placeholder="6"
          />
          <small>6 USD/lot means 0.01 lot costs 0.06 USD.</small>
        </label>

        <label className="field">
          <span>Account type</span>
          <select
            value={accountType}
            onChange={(event) => {
              const nextType = event.target.value as AccountType;
              setAccountType(nextType);
              if (nextType === "backtesting") setRiskPlanId("");
            }}
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
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
          {strategies.length === 0 ? (
            <p>No strategies created yet.</p>
          ) : (
            strategies.map((strategy) => (
              <label key={strategy.id}>
                <input
                  type="checkbox"
                  checked={strategyIds.includes(strategy.id)}
                  onChange={(event) =>
                    toggleStrategy(strategy.id, event.target.checked)
                  }
                />
                <span>{strategy.name}</span>
              </label>
            ))
          )}
        </fieldset>
      </form>
    </CreateModalShell>
  );
}

function CreateStrategyDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [entryRules, setEntryRules] = useState("");
  const [slTpRules, setSlTpRules] = useState("");
  const [invalidationRules, setInvalidationRules] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await createStrategy({
        name,
        strategy,
        entryRules,
        slTpRules,
        invalidationRules,
      });
      await onCreated();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create strategy.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <CreateModalShell
      title="Create strategy"
      subtitle="Strategy rules and invalidation."
      formId="create-strategy-form"
      submitLabel="Create strategy"
      saving={saving}
      error={error}
      onClose={onClose}
    >
      <form
        id="create-strategy-form"
        className="account-create-form"
        onSubmit={handleSubmit}
      >
        <label className="field field-wide">
          <span>Strategy name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="London continuation"
          />
        </label>

        <label className="field field-wide">
          <span>Strategy</span>
          <textarea
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
            placeholder="What this strategy is looking for"
          />
        </label>

        <label className="field field-wide">
          <span>Entry rules</span>
          <textarea
            value={entryRules}
            onChange={(event) => setEntryRules(event.target.value)}
            placeholder="What must be true before entering"
          />
        </label>

        <label className="field field-wide">
          <span>SL and TP rules</span>
          <textarea
            value={slTpRules}
            onChange={(event) => setSlTpRules(event.target.value)}
            placeholder="How stop loss and take profit are chosen"
          />
        </label>

        <label className="field field-wide">
          <span>Invalidation rules</span>
          <textarea
            value={invalidationRules}
            onChange={(event) => setInvalidationRules(event.target.value)}
            placeholder="When this setup is no longer valid"
          />
        </label>
      </form>
    </CreateModalShell>
  );
}

function CreateRiskDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [activeRiskTab, setActiveRiskTab] = useState<RiskCreateTab>("risk");
  const [riskPerTradeMinPercent, setRiskPerTradeMinPercent] = useState("");
  const [riskPerTradeMaxPercent, setRiskPerTradeMaxPercent] = useState("");
  const [riskPerDayMinPercent, setRiskPerDayMinPercent] = useState("");
  const [riskPerDayMidPercent, setRiskPerDayMidPercent] = useState("");
  const [riskPerDayMaxPercent, setRiskPerDayMaxPercent] = useState("");
  const [riskPerWeekMinPercent, setRiskPerWeekMinPercent] = useState("");
  const [riskPerWeekMaxPercent, setRiskPerWeekMaxPercent] = useState("");
  const [maxTradesPerDay, setMaxTradesPerDay] = useState("");
  const [maxLosingTradesPerDay, setMaxLosingTradesPerDay] = useState("");
  const [maxLosingDaysInRow, setMaxLosingDaysInRow] = useState("");
  const [dailyGoalMinPercent, setDailyGoalMinPercent] = useState("");
  const [dailyGoalMaxPercent, setDailyGoalMaxPercent] = useState("");
  const [weeklyGoalMinPercent, setWeeklyGoalMinPercent] = useState("");
  const [weeklyGoalMidPercent, setWeeklyGoalMidPercent] = useState("");
  const [weeklyGoalMaxPercent, setWeeklyGoalMaxPercent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function optionalPercent(value: string) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Percent values must be 0 or higher.");
    }
    return parsed;
  }

  function optionalAmount(value: string) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error("Amount values must be whole numbers, 0 or higher.");
    }
    return parsed;
  }

  function validateRange(
    label: string,
    min: number | null,
    max: number | null,
  ) {
    if (min !== null && max !== null && min > max) {
      throw new Error(`${label}: min cannot be higher than max.`);
    }
  }

  function validateTripleRange(
    label: string,
    min: number | null,
    mid: number | null,
    max: number | null,
  ) {
    validateRange(label, min, max);
    if (min !== null && mid !== null && min > mid) {
      throw new Error(`${label}: min cannot be higher than mid.`);
    }
    if (mid !== null && max !== null && mid > max) {
      throw new Error(`${label}: mid cannot be higher than max.`);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const riskPerTradeMin = optionalPercent(riskPerTradeMinPercent);
      const riskPerTradeMax = optionalPercent(riskPerTradeMaxPercent);
      const riskPerDayMin = optionalPercent(riskPerDayMinPercent);
      const riskPerDayMid = optionalPercent(riskPerDayMidPercent);
      const riskPerDayMax = optionalPercent(riskPerDayMaxPercent);
      const riskPerWeekMin = optionalPercent(riskPerWeekMinPercent);
      const riskPerWeekMax = optionalPercent(riskPerWeekMaxPercent);
      const dailyGoalMin = optionalPercent(dailyGoalMinPercent);
      const dailyGoalMax = optionalPercent(dailyGoalMaxPercent);
      const weeklyGoalMin = optionalPercent(weeklyGoalMinPercent);
      const weeklyGoalMid = optionalPercent(weeklyGoalMidPercent);
      const weeklyGoalMax = optionalPercent(weeklyGoalMaxPercent);

      validateRange("Risk per trade", riskPerTradeMin, riskPerTradeMax);
      validateTripleRange(
        "Risk per day",
        riskPerDayMin,
        riskPerDayMid,
        riskPerDayMax,
      );
      validateRange("Risk per week", riskPerWeekMin, riskPerWeekMax);
      validateRange("Daily goal", dailyGoalMin, dailyGoalMax);
      validateTripleRange(
        "Weekly goal",
        weeklyGoalMin,
        weeklyGoalMid,
        weeklyGoalMax,
      );

      await createRiskManagementPlan({
        name,
        riskPerTradeMinPercent: riskPerTradeMin,
        riskPerTradeMaxPercent: riskPerTradeMax,
        riskPerDayMinPercent: riskPerDayMin,
        riskPerDayMidPercent: riskPerDayMid,
        riskPerDayMaxPercent: riskPerDayMax,
        riskPerWeekMinPercent: riskPerWeekMin,
        riskPerWeekMaxPercent: riskPerWeekMax,
        maxTradesPerDay: optionalAmount(maxTradesPerDay),
        maxLosingTradesPerDay: optionalAmount(maxLosingTradesPerDay),
        maxLosingDaysInRow: optionalAmount(maxLosingDaysInRow),
        dailyGoalMinPercent: dailyGoalMin,
        dailyGoalMaxPercent: dailyGoalMax,
        weeklyGoalMinPercent: weeklyGoalMin,
        weeklyGoalMidPercent: weeklyGoalMid,
        weeklyGoalMaxPercent: weeklyGoalMax,
        notes: "",
      });
      await onCreated();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create risk plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <CreateModalShell
      title="Create risk plan"
      subtitle="Risk limits and goals."
      formId="create-risk-form"
      submitLabel="Create risk plan"
      saving={saving}
      error={error}
      onClose={onClose}
    >
      <form
        id="create-risk-form"
        className="account-create-form risk-create-form"
        onSubmit={handleSubmit}
      >
        <label className="field field-wide">
          <span>Risk plan name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="1% fixed risk"
          />
        </label>

        <div className="tab-bar account-modal-tabs" role="tablist">
          <button
            className={`tab ${activeRiskTab === "risk" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeRiskTab === "risk"}
            onClick={() => setActiveRiskTab("risk")}
          >
            Risk
          </button>
          <button
            className={`tab ${activeRiskTab === "goal" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeRiskTab === "goal"}
            onClick={() => setActiveRiskTab("goal")}
          >
            Goal
          </button>
        </div>

        {activeRiskTab === "risk" ? (
          <div className="risk-plan-tab">
            <RiskFieldGroup title="Risk per trade" columns={2}>
              <RiskNumberField
                label="Min %"
                value={riskPerTradeMinPercent}
                onChange={setRiskPerTradeMinPercent}
                placeholder="0.5"
              />
              <RiskNumberField
                label="Max %"
                value={riskPerTradeMaxPercent}
                onChange={setRiskPerTradeMaxPercent}
                placeholder="1"
              />
            </RiskFieldGroup>

            <RiskFieldGroup title="Risk per day" columns={3}>
              <RiskNumberField
                label="Min %"
                value={riskPerDayMinPercent}
                onChange={setRiskPerDayMinPercent}
                placeholder="1"
              />
              <RiskNumberField
                label="Mid %"
                value={riskPerDayMidPercent}
                onChange={setRiskPerDayMidPercent}
                placeholder="2"
              />
              <RiskNumberField
                label="Max %"
                value={riskPerDayMaxPercent}
                onChange={setRiskPerDayMaxPercent}
                placeholder="3"
              />
            </RiskFieldGroup>

            <RiskFieldGroup title="Risk per week" columns={2}>
              <RiskNumberField
                label="Min %"
                value={riskPerWeekMinPercent}
                onChange={setRiskPerWeekMinPercent}
                placeholder="2"
              />
              <RiskNumberField
                label="Max %"
                value={riskPerWeekMaxPercent}
                onChange={setRiskPerWeekMaxPercent}
                placeholder="6"
              />
            </RiskFieldGroup>

            <RiskFieldGroup title="Trade limits" columns={3}>
              <RiskNumberField
                label="Max trades per day"
                value={maxTradesPerDay}
                onChange={setMaxTradesPerDay}
                placeholder="3"
                integer
              />
              <RiskNumberField
                label="Max losing trades in a row in a day"
                value={maxLosingTradesPerDay}
                onChange={setMaxLosingTradesPerDay}
                placeholder="2"
                integer
              />
              <RiskNumberField
                label="Max losing days in a row"
                value={maxLosingDaysInRow}
                onChange={setMaxLosingDaysInRow}
                placeholder="2"
                integer
              />
            </RiskFieldGroup>
          </div>
        ) : (
          <div className="risk-plan-tab">
            <RiskFieldGroup title="Daily goal" columns={2}>
              <RiskNumberField
                label="Min %"
                value={dailyGoalMinPercent}
                onChange={setDailyGoalMinPercent}
                placeholder="1"
              />
              <RiskNumberField
                label="Max %"
                value={dailyGoalMaxPercent}
                onChange={setDailyGoalMaxPercent}
                placeholder="2"
              />
            </RiskFieldGroup>

            <RiskFieldGroup title="Weekly goal" columns={3}>
              <RiskNumberField
                label="Min %"
                value={weeklyGoalMinPercent}
                onChange={setWeeklyGoalMinPercent}
                placeholder="3"
              />
              <RiskNumberField
                label="Mid %"
                value={weeklyGoalMidPercent}
                onChange={setWeeklyGoalMidPercent}
                placeholder="5"
              />
              <RiskNumberField
                label="Max %"
                value={weeklyGoalMaxPercent}
                onChange={setWeeklyGoalMaxPercent}
                placeholder="8"
              />
            </RiskFieldGroup>
          </div>
        )}
      </form>
    </CreateModalShell>
  );
}

function RiskFieldGroup({
  title,
  columns,
  children,
}: {
  title: string;
  columns: 2 | 3;
  children: ReactNode;
}) {
  return (
    <section className="risk-field-group">
      <h4>{title}</h4>
      <div
        className={`risk-field-grid ${
          columns === 3 ? "risk-field-grid-three" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function RiskNumberField({
  label,
  value,
  onChange,
  placeholder,
  integer = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  integer?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step={integer ? "1" : "0.01"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function CreateModalShell({
  title,
  subtitle,
  formId,
  submitLabel,
  saving,
  error,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  formId: string;
  submitLabel: string;
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
            {saving ? "Saving..." : submitLabel}
          </button>
        </>
      }
    >
      {children}
    </ModalShell>
  );
}
