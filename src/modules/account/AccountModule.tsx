import { ArrowLeft, Plus, ShieldCheck, Target, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listAccountSetup,
  type AccountType,
  type RiskManagementPlan,
  type Strategy,
  type TradingAccount,
} from "../../shared/db/database";
import {
  CreateAccountSetupDialog,
  type AccountSetupCreateKind,
} from "./features/createAccountSetup/CreateAccountSetupDialogs";
import type { ModuleContext } from "../../app/types";

type AccountTab = "accounts" | "strategies" | "risk";

const ACCOUNT_TABS: { id: AccountTab; label: string; icon: JSX.Element }[] = [
  { id: "accounts", label: "Accounts", icon: <Wallet size={16} /> },
  { id: "strategies", label: "Strategy", icon: <Target size={16} /> },
  {
    id: "risk",
    label: "Risk Management",
    icon: <ShieldCheck size={16} />,
  },
];

const ACCOUNT_TYPES: { id: AccountType; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "demo", label: "Demo" },
  { id: "backtesting", label: "Backtesting" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

function accountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPES.find((item) => item.id === type)?.label ?? type;
}

function money(value: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()];
  return symbol
    ? `${symbol}${value.toFixed(2)}`
    : `${currency} ${value.toFixed(2)}`;
}

function percentRangeValue(min: number | null, max: number | null) {
  if (min == null && max == null) return "-";
  if (min == null) return `up to ${max}%`;
  if (max == null) return `${min}%+`;
  return `${min}-${max}%`;
}

function percentTripleValue(
  min: number | null,
  mid: number | null,
  max: number | null,
) {
  if (min == null && mid == null && max == null) return "-";
  if (min != null && mid != null && max != null) return `${min}-${mid}-${max}%`;

  return [
    min == null ? null : `min ${min}%`,
    mid == null ? null : `mid ${mid}%`,
    max == null ? null : `max ${max}%`,
  ]
    .filter(Boolean)
    .join(" / ");
}

function amountValue(value: number | null) {
  return value == null ? "-" : String(value);
}

function riskPlanLabel(plan: RiskManagementPlan) {
  return `Trade ${percentRangeValue(
    plan.riskPerTradeMinPercent,
    plan.riskPerTradeMaxPercent,
  )} / Day ${percentTripleValue(
    plan.riskPerDayMinPercent,
    plan.riskPerDayMidPercent,
    plan.riskPerDayMaxPercent,
  )}`;
}

function riskGoalLabel(plan: RiskManagementPlan) {
  return `Week risk ${percentRangeValue(
    plan.riskPerWeekMinPercent,
    plan.riskPerWeekMaxPercent,
  )} / Daily goal ${percentRangeValue(
    plan.dailyGoalMinPercent,
    plan.dailyGoalMaxPercent,
  )} / Weekly goal ${percentTripleValue(
    plan.weeklyGoalMinPercent,
    plan.weeklyGoalMidPercent,
    plan.weeklyGoalMaxPercent,
  )}`;
}

export function AccountModule({ onAccountsChanged }: ModuleContext) {
  const [activeTab, setActiveTab] = useState<AccountTab>("accounts");
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [riskPlans, setRiskPlans] = useState<RiskManagementPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [createModal, setCreateModal] = useState<AccountSetupCreateKind | null>(
    null,
  );

  async function reload() {
    setLoading(true);
    try {
      const data = await listAccountSetup();
      setAccounts(data.accounts);
      setStrategies(data.strategies);
      setRiskPlans(data.riskPlans);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  if (selectedAccount) {
    return (
      <AccountDetailView
        account={selectedAccount}
        strategies={strategies}
        riskPlans={riskPlans}
        onBack={() => setSelectedAccountId(null)}
      />
    );
  }

  return (
    <div className="account-module">
      <header className="page-header">
        <div>
          <h2>Account</h2>
          <p className="page-subtitle">
            Accounts, strategies, and risk management plans.
          </p>
        </div>
      </header>

      <div className="tab-bar" role="tablist" aria-label="Account setup">
        {ACCOUNT_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span className="tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "accounts" ? (
        <AccountsList
          accounts={accounts}
          strategies={strategies}
          riskPlans={riskPlans}
          loading={loading}
          onOpenAccount={setSelectedAccountId}
          onCreate={() => setCreateModal("accounts")}
        />
      ) : null}
      {activeTab === "strategies" ? (
        <SimpleList
          title="Strategies"
          emptyText="No strategies yet."
          loading={loading}
          onCreate={() => setCreateModal("strategies")}
          items={strategies.map((strategy) => ({
            id: strategy.id,
            title: strategy.name,
            subtitle: strategy.strategy || "No strategy details yet.",
          }))}
        />
      ) : null}
      {activeTab === "risk" ? (
        <SimpleList
          title="Risk management plans"
          emptyText="No risk plans yet."
          loading={loading}
          onCreate={() => setCreateModal("risk")}
          items={riskPlans.map((plan) => ({
            id: plan.id,
            title: plan.name,
            subtitle: riskPlanLabel(plan),
            body: riskGoalLabel(plan),
          }))}
        />
      ) : null}

      {createModal ? (
        <CreateAccountSetupDialog
          kind={createModal}
          strategies={strategies}
          riskPlans={riskPlans}
          onClose={() => setCreateModal(null)}
          onCreated={async () => {
            await reload();
            await onAccountsChanged();
            setCreateModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AccountsList({
  accounts,
  strategies,
  riskPlans,
  loading,
  onOpenAccount,
  onCreate,
}: {
  accounts: TradingAccount[];
  strategies: Strategy[];
  riskPlans: RiskManagementPlan[];
  loading: boolean;
  onOpenAccount: (accountId: string) => void;
  onCreate: () => void;
}) {
  const strategyMap = useMemo(
    () => new Map(strategies.map((strategy) => [strategy.id, strategy])),
    [strategies],
  );
  const riskMap = useMemo(
    () => new Map(riskPlans.map((plan) => [plan.id, plan])),
    [riskPlans],
  );

  return (
    <section className="account-list" aria-label="Accounts">
      <header className="account-list-header">
        <div>
          <h3>Accounts</h3>
          <span>Double-click an account to open details.</span>
        </div>
        <button
          className="ghost-button account-create-button"
          type="button"
          onClick={onCreate}
        >
          <Plus size={14} aria-hidden="true" />
          Create
        </button>
      </header>
      {loading ? (
        <p className="empty-state">Loading accounts...</p>
      ) : accounts.length === 0 ? (
        <p className="empty-state">No accounts yet.</p>
      ) : (
        accounts.map((account) => (
          <article
            className="account-card account-card-clickable"
            key={account.id}
            onDoubleClick={() => onOpenAccount(account.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onOpenAccount(account.id);
            }}
            tabIndex={0}
            title="Double-click to open details"
          >
            <header>
              <div>
                <h3>{account.name}</h3>
                <span>{accountTypeLabel(account.accountType)}</span>
              </div>
              <strong>
                {money(account.startingBalance, account.currency)}
              </strong>
            </header>
            <dl>
              <div>
                <dt>Commission</dt>
                <dd>{money(account.commission, account.currency)}/lot</dd>
              </div>
              <div>
                <dt>Strategies</dt>
                <dd>
                  {account.strategyIds
                    .map((id) => strategyMap.get(id)?.name)
                    .filter(Boolean)
                    .join(", ") || "-"}
                </dd>
              </div>
              <div>
                <dt>Risk plan</dt>
                <dd>
                  {account.riskPlanId
                    ? riskMap.get(account.riskPlanId)?.name || "-"
                    : "-"}
                </dd>
              </div>
            </dl>
          </article>
        ))
      )}
    </section>
  );
}

function SimpleList({
  title,
  loading,
  emptyText,
  items,
  onCreate,
}: {
  title: string;
  loading: boolean;
  emptyText: string;
  items: { id: string; title: string; subtitle: string; body?: string }[];
  onCreate: () => void;
}) {
  return (
    <section className="account-list">
      <header className="account-list-header">
        <div>
          <h3>{title}</h3>
          <span>{items.length} saved</span>
        </div>
        <button
          className="ghost-button account-create-button"
          type="button"
          onClick={onCreate}
        >
          <Plus size={14} aria-hidden="true" />
          Create
        </button>
      </header>
      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : items.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        items.map((item) => (
          <article className="account-card" key={item.id}>
            <header>
              <div>
                <h3>{item.title}</h3>
                <span>{item.subtitle}</span>
              </div>
            </header>
            {item.body ? <p>{item.body}</p> : null}
          </article>
        ))
      )}
    </section>
  );
}

function AccountDetailView({
  account,
  strategies,
  riskPlans,
  onBack,
}: {
  account: TradingAccount;
  strategies: Strategy[];
  riskPlans: RiskManagementPlan[];
  onBack: () => void;
}) {
  const strategyMap = new Map(
    strategies.map((strategy) => [strategy.id, strategy]),
  );
  const riskPlan = account.riskPlanId
    ? (riskPlans.find((plan) => plan.id === account.riskPlanId) ?? null)
    : null;
  const linkedStrategies = account.strategyIds
    .map((id) => strategyMap.get(id))
    .filter((strategy): strategy is Strategy => Boolean(strategy));

  return (
    <div className="account-module">
      <header className="account-detail-header">
        <button
          className="icon-button back-button"
          type="button"
          onClick={onBack}
          aria-label="Back to accounts"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <h2>{account.name}</h2>
          <p className="page-subtitle">
            {accountTypeLabel(account.accountType)} account details.
          </p>
        </div>
      </header>

      <section className="account-detail-grid">
        <article className="account-detail-panel">
          <h3>Account</h3>
          <dl>
            <div>
              <dt>Type</dt>
              <dd>{accountTypeLabel(account.accountType)}</dd>
            </div>
            <div>
              <dt>Starting balance</dt>
              <dd>{money(account.startingBalance, account.currency)}</dd>
            </div>
            <div>
              <dt>Commission</dt>
              <dd>{money(account.commission, account.currency)}/lot</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{account.currency}</dd>
            </div>
          </dl>
        </article>

        <article className="account-detail-panel">
          <h3>Strategies</h3>
          {linkedStrategies.length === 0 ? (
            <p>No strategies connected.</p>
          ) : (
            <div className="account-detail-list">
              {linkedStrategies.map((strategy) => (
                <div key={strategy.id}>
                  <strong>{strategy.name}</strong>
                  <span>{strategy.strategy || "No strategy details yet."}</span>
                  {strategy.entryRules ? (
                    <span>Entry: {strategy.entryRules}</span>
                  ) : null}
                  {strategy.slTpRules ? (
                    <span>SL/TP: {strategy.slTpRules}</span>
                  ) : null}
                  {strategy.invalidationRules ? (
                    <span>Invalidation: {strategy.invalidationRules}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="account-detail-panel">
          <h3>Risk management</h3>
          {riskPlan ? (
            <dl>
              <div>
                <dt>Plan</dt>
                <dd>{riskPlan.name}</dd>
              </div>
              <div>
                <dt>Risk per trade</dt>
                <dd>
                  {percentRangeValue(
                    riskPlan.riskPerTradeMinPercent,
                    riskPlan.riskPerTradeMaxPercent,
                  )}
                </dd>
              </div>
              <div>
                <dt>Risk per day</dt>
                <dd>
                  {percentTripleValue(
                    riskPlan.riskPerDayMinPercent,
                    riskPlan.riskPerDayMidPercent,
                    riskPlan.riskPerDayMaxPercent,
                  )}
                </dd>
              </div>
              <div>
                <dt>Risk per week</dt>
                <dd>
                  {percentRangeValue(
                    riskPlan.riskPerWeekMinPercent,
                    riskPlan.riskPerWeekMaxPercent,
                  )}
                </dd>
              </div>
              <div>
                <dt>Max trades per day</dt>
                <dd>{amountValue(riskPlan.maxTradesPerDay)}</dd>
              </div>
              <div>
                <dt>Max losing trades/day</dt>
                <dd>{amountValue(riskPlan.maxLosingTradesPerDay)}</dd>
              </div>
              <div>
                <dt>Max losing days row</dt>
                <dd>{amountValue(riskPlan.maxLosingDaysInRow)}</dd>
              </div>
              <div>
                <dt>Daily goal</dt>
                <dd>
                  {percentRangeValue(
                    riskPlan.dailyGoalMinPercent,
                    riskPlan.dailyGoalMaxPercent,
                  )}
                </dd>
              </div>
              <div>
                <dt>Weekly goal</dt>
                <dd>
                  {percentTripleValue(
                    riskPlan.weeklyGoalMinPercent,
                    riskPlan.weeklyGoalMidPercent,
                    riskPlan.weeklyGoalMaxPercent,
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p>No risk plan connected.</p>
          )}
        </article>
      </section>
    </div>
  );
}
