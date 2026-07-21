import {
  ArrowLeft,
  Pencil,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteEducator,
  deleteRiskManagementPlan,
  deleteStrategy,
  deleteTradingAccount,
  listAccountSetup,
  listTrades,
  type AccountType,
  type Educator,
  type RiskManagementPlan,
  type Strategy,
  type TradingAccount,
} from "../../shared/db/database";
import { deleteScreenshotFile } from "../../shared/db/storage";
import {
  CreateAccountSetupDialog,
  type AccountSetupCreateKind,
} from "./features/createAccountSetup/CreateAccountSetupDialogs";
import type { ModuleContext } from "../../app/types";
import {
  formatCurrencyValue,
  shouldConfirmDelete,
  TRADE_TARGET_UNIT_OPTIONS,
  type AppPreferences,
} from "../../shared/appPreferences";
import { EditAccountSetupDialog } from "./EditAccountSetupDialog";

type AccountTab = "accounts" | "strategies" | "educators" | "risk";

const ACCOUNT_TABS: { id: AccountTab; label: string; icon: JSX.Element }[] = [
  { id: "accounts", label: "Accounts", icon: <Wallet size={16} /> },
  { id: "strategies", label: "Strategy", icon: <Target size={16} /> },
  { id: "educators", label: "Educators", icon: <Users size={16} /> },
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
  { id: "system", label: "System Account" },
];

function accountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPES.find((item) => item.id === type)?.label ?? type;
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

function strategyTargetPlanLabel(strategy: Strategy) {
  if (strategy.targetMode === "risk-reward") {
    return `Risk / Reward · 1:${strategy.riskRewardGoal ?? 1}`;
  }
  if (strategy.targetMode === "fixed") {
    const unit =
      TRADE_TARGET_UNIT_OPTIONS.find(
        (option) => option.value === strategy.targetUnit,
      )?.label ?? strategy.targetUnit;
    return `Fixed ${unit} · SL ${strategy.fixedStopLoss ?? "-"} · TP ${strategy.fixedTakeProfits.join(" / ") || "-"}`;
  }
  return "Custom in workflow";
}

export function AccountModule({
  appPreferences,
  onAccountsChanged,
}: ModuleContext) {
  const [activeTab, setActiveTab] = useState<AccountTab>("accounts");
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [riskPlans, setRiskPlans] = useState<RiskManagementPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(
    null,
  );
  const [selectedEducatorId, setSelectedEducatorId] = useState<string | null>(
    null,
  );
  const [selectedRiskPlanId, setSelectedRiskPlanId] = useState<string | null>(
    null,
  );
  const [createModal, setCreateModal] = useState<AccountSetupCreateKind | null>(
    null,
  );
  const [editModal, setEditModal] = useState<AccountSetupCreateKind | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await listAccountSetup();
      setAccounts(data.accounts);
      setStrategies(data.strategies);
      setEducators(data.educators);
      setRiskPlans(data.riskPlans);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    function handleOpenSetup(event: Event) {
      const detail = (event as CustomEvent<{ kind: AccountTab; id: string }>)
        .detail;
      if (!detail?.id) return;
      setActiveTab(detail.kind);
      if (detail.kind === "accounts") openAccount(detail.id);
      if (detail.kind === "strategies") openStrategy(detail.id);
      if (detail.kind === "educators") openEducator(detail.id);
      if (detail.kind === "risk") openRiskPlan(detail.id);
    }
    window.addEventListener(
      "trading-journal:open-account-setup",
      handleOpenSetup,
    );
    return () =>
      window.removeEventListener(
        "trading-journal:open-account-setup",
        handleOpenSetup,
      );
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );
  const selectedStrategy = useMemo(
    () =>
      strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null,
    [strategies, selectedStrategyId],
  );
  const selectedEducator = useMemo(
    () =>
      educators.find((educator) => educator.id === selectedEducatorId) ?? null,
    [educators, selectedEducatorId],
  );
  const selectedRiskPlan = useMemo(
    () => riskPlans.find((plan) => plan.id === selectedRiskPlanId) ?? null,
    [riskPlans, selectedRiskPlanId],
  );

  function openAccount(accountId: string) {
    setSelectedAccountId(accountId);
    setSelectedStrategyId(null);
    setSelectedEducatorId(null);
    setSelectedRiskPlanId(null);
  }

  function openStrategy(strategyId: string) {
    setSelectedAccountId(null);
    setSelectedStrategyId(strategyId);
    setSelectedEducatorId(null);
    setSelectedRiskPlanId(null);
  }

  function openEducator(educatorId: string) {
    setSelectedAccountId(null);
    setSelectedStrategyId(null);
    setSelectedEducatorId(educatorId);
    setSelectedRiskPlanId(null);
  }

  function openRiskPlan(riskPlanId: string) {
    setSelectedAccountId(null);
    setSelectedStrategyId(null);
    setSelectedEducatorId(null);
    setSelectedRiskPlanId(riskPlanId);
  }

  async function handleEdited() {
    await reload();
    await onAccountsChanged();
    setEditModal(null);
    setActionError(null);
  }

  async function handleDelete(kind: AccountSetupCreateKind) {
    const label =
      kind === "accounts"
        ? selectedAccount?.name
        : kind === "strategies"
          ? selectedStrategy?.name
          : kind === "educators"
            ? selectedEducator?.name
            : selectedRiskPlan?.name;
    if (!label) return;

    const warning =
      kind === "accounts"
        ? `Delete ${label}? Its trades, recaps, and screenshots will also be permanently deleted.`
        : `Delete ${label}? This cannot be undone.`;
    if (shouldConfirmDelete(appPreferences) && !window.confirm(warning)) return;

    setActionError(null);
    try {
      if (kind === "accounts" && selectedAccount) {
        const trades = await listTrades(selectedAccount.id);
        await Promise.allSettled(
          trades.flatMap((trade) =>
            trade.screenshots.map((screenshot) =>
              deleteScreenshotFile(screenshot.path),
            ),
          ),
        );
        await deleteTradingAccount(selectedAccount.id);
        setSelectedAccountId(null);
      }
      if (kind === "strategies" && selectedStrategy) {
        await deleteStrategy(selectedStrategy.id);
        setSelectedStrategyId(null);
      }
      if (kind === "educators" && selectedEducator) {
        await deleteEducator(selectedEducator.id);
        setSelectedEducatorId(null);
      }
      if (kind === "risk" && selectedRiskPlan) {
        await deleteRiskManagementPlan(selectedRiskPlan.id);
        setSelectedRiskPlanId(null);
      }
      await reload();
      await onAccountsChanged();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete this item.",
      );
    }
  }

  if (selectedAccount) {
    return (
      <>
        <AccountDetailView
          account={selectedAccount}
          actionError={actionError}
          appPreferences={appPreferences}
          strategies={strategies}
          educators={educators}
          riskPlans={riskPlans}
          onBack={() => setSelectedAccountId(null)}
          onDelete={() => handleDelete("accounts")}
          onEdit={() => setEditModal("accounts")}
        />
        {editModal === "accounts" ? (
          <EditAccountSetupDialog
            kind="accounts"
            appPreferences={appPreferences}
            account={selectedAccount}
            strategies={strategies}
            educators={educators}
            riskPlans={riskPlans}
            onClose={() => setEditModal(null)}
            onSaved={handleEdited}
          />
        ) : null}
      </>
    );
  }

  if (selectedStrategy) {
    return (
      <>
        <StrategyDetailView
          strategy={selectedStrategy}
          actionError={actionError}
          onBack={() => setSelectedStrategyId(null)}
          onDelete={() => handleDelete("strategies")}
          onEdit={() => setEditModal("strategies")}
        />
        {editModal === "strategies" ? (
          <EditAccountSetupDialog
            kind="strategies"
            appPreferences={appPreferences}
            strategy={selectedStrategy}
            strategies={strategies}
            educators={educators}
            riskPlans={riskPlans}
            onClose={() => setEditModal(null)}
            onSaved={handleEdited}
          />
        ) : null}
      </>
    );
  }

  if (selectedEducator) {
    return (
      <>
        <EducatorDetailView
          educator={selectedEducator}
          strategies={strategies}
          actionError={actionError}
          onBack={() => setSelectedEducatorId(null)}
          onDelete={() => handleDelete("educators")}
          onEdit={() => setEditModal("educators")}
        />
        {editModal === "educators" ? (
          <EditAccountSetupDialog
            kind="educators"
            appPreferences={appPreferences}
            educator={selectedEducator}
            strategies={strategies}
            educators={educators}
            riskPlans={riskPlans}
            onClose={() => setEditModal(null)}
            onSaved={handleEdited}
          />
        ) : null}
      </>
    );
  }

  if (selectedRiskPlan) {
    return (
      <>
        <RiskPlanDetailView
          plan={selectedRiskPlan}
          actionError={actionError}
          onBack={() => setSelectedRiskPlanId(null)}
          onDelete={() => handleDelete("risk")}
          onEdit={() => setEditModal("risk")}
        />
        {editModal === "risk" ? (
          <EditAccountSetupDialog
            kind="risk"
            appPreferences={appPreferences}
            riskPlan={selectedRiskPlan}
            strategies={strategies}
            educators={educators}
            riskPlans={riskPlans}
            onClose={() => setEditModal(null)}
            onSaved={handleEdited}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="account-module">
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
          appPreferences={appPreferences}
          strategies={strategies}
          educators={educators}
          riskPlans={riskPlans}
          loading={loading}
          onOpenAccount={openAccount}
          onCreate={() => setCreateModal("accounts")}
        />
      ) : null}
      {activeTab === "strategies" ? (
        <SimpleList
          title="Strategies"
          emptyText="No strategies yet."
          loading={loading}
          openHint="Double-click a strategy to open details."
          onOpenItem={openStrategy}
          onCreate={() => setCreateModal("strategies")}
          items={strategies.map((strategy) => ({
            id: strategy.id,
            title: strategy.name,
            subtitle: strategy.strategy || "No strategy details yet.",
          }))}
        />
      ) : null}
      {activeTab === "educators" ? (
        <SimpleList
          title="Educators"
          emptyText="No educators yet."
          loading={loading}
          openHint="Double-click an educator to open details."
          onOpenItem={openEducator}
          onCreate={() => setCreateModal("educators")}
          items={educators.map((educator) => {
            const strategyNames = educator.strategyIds
              .map(
                (strategyId) =>
                  strategies.find((strategy) => strategy.id === strategyId)
                    ?.name,
              )
              .filter((name): name is string => Boolean(name));
            return {
              id: educator.id,
              title: educator.name,
              subtitle: [
                educator.community || "Independent educator",
                strategyNames.length > 0
                  ? `Strategies: ${strategyNames.join(", ")}`
                  : "No strategies",
              ].join(" · "),
            };
          })}
        />
      ) : null}
      {activeTab === "risk" ? (
        <SimpleList
          title="Risk management plans"
          emptyText="No risk plans yet."
          loading={loading}
          openHint="Double-click a risk plan to open details."
          onOpenItem={openRiskPlan}
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
          appPreferences={appPreferences}
          strategies={strategies}
          educators={educators}
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
  appPreferences,
  strategies,
  educators,
  riskPlans,
  loading,
  onOpenAccount,
  onCreate,
}: {
  accounts: TradingAccount[];
  appPreferences: AppPreferences;
  strategies: Strategy[];
  educators: Educator[];
  riskPlans: RiskManagementPlan[];
  loading: boolean;
  onOpenAccount: (accountId: string) => void;
  onCreate: () => void;
}) {
  const strategyMap = useMemo(
    () => new Map(strategies.map((strategy) => [strategy.id, strategy])),
    [strategies],
  );
  const educatorMap = useMemo(
    () => new Map(educators.map((educator) => [educator.id, educator])),
    [educators],
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
        <div className="list-table-shell">
          <table className="list-table account-accounts-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Commission</th>
                <th>Trading source</th>
                <th>Risk plan</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  className="list-table-row list-table-row-clickable"
                  key={account.id}
                  onDoubleClick={() => onOpenAccount(account.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onOpenAccount(account.id);
                  }}
                  tabIndex={0}
                  title="Double-click to open details"
                >
                  <td>
                    <strong>{account.name}</strong>
                  </td>
                  <td>{accountTypeLabel(account.accountType)}</td>
                  <td>
                    {formatCurrencyValue(
                      account.commission,
                      account.currency,
                      appPreferences,
                    )}
                    /lot
                  </td>
                  <td>
                    {account.accountType === "system"
                      ? account.educatorIds
                          .map((id) => educatorMap.get(id)?.name)
                          .filter(Boolean)
                          .join(", ") || "-"
                      : account.strategyIds
                          .map((id) => strategyMap.get(id)?.name)
                          .filter(Boolean)
                          .join(", ") || "-"}
                  </td>
                  <td>
                    {account.riskPlanId
                      ? riskMap.get(account.riskPlanId)?.name || "-"
                      : "-"}
                  </td>
                  <td className="num account-balance-cell">
                    {formatCurrencyValue(
                      account.startingBalance,
                      account.currency,
                      appPreferences,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SimpleList({
  title,
  loading,
  emptyText,
  items,
  openHint,
  onOpenItem,
  onCreate,
}: {
  title: string;
  loading: boolean;
  emptyText: string;
  items: { id: string; title: string; subtitle: string; body?: string }[];
  openHint?: string;
  onOpenItem?: (itemId: string) => void;
  onCreate: () => void;
}) {
  const hasBody = items.some((item) => item.body);

  return (
    <section className="account-list">
      <header className="account-list-header">
        <div>
          <h3>{title}</h3>
          <span>{openHint ?? `${items.length} saved`}</span>
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
        <div className="list-table-shell">
          <table
            className={`list-table account-setup-table ${
              hasBody ? "has-body" : ""
            }`}
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>Details</th>
                {hasBody ? <th>Goals</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  className={`list-table-row ${
                    onOpenItem ? "list-table-row-clickable" : ""
                  }`}
                  key={item.id}
                  onDoubleClick={() => onOpenItem?.(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onOpenItem?.(item.id);
                  }}
                  tabIndex={onOpenItem ? 0 : undefined}
                  title={onOpenItem ? "Double-click to open details" : ""}
                >
                  <td>
                    <strong>{item.title}</strong>
                  </td>
                  <td>{item.subtitle}</td>
                  {hasBody ? <td>{item.body || "-"}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DetailActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="account-detail-actions">
      <button className="ghost-button" type="button" onClick={onEdit}>
        <Pencil size={14} aria-hidden="true" />
        Edit
      </button>
      <button
        className="ghost-button danger-button"
        type="button"
        onClick={onDelete}
      >
        <Trash2 size={14} aria-hidden="true" />
        Delete
      </button>
    </div>
  );
}

function StrategyDetailView({
  strategy,
  actionError,
  onBack,
  onEdit,
  onDelete,
}: {
  strategy: Strategy;
  actionError: string | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="account-module">
      <header className="account-detail-header">
        <button
          className="icon-button back-button"
          type="button"
          onClick={onBack}
          aria-label="Back to strategies"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <h2>{strategy.name}</h2>
          <p className="page-subtitle">Strategy details.</p>
        </div>
        <DetailActions onEdit={onEdit} onDelete={onDelete} />
      </header>

      {actionError ? (
        <p className="account-action-error">{actionError}</p>
      ) : null}

      <section className="account-detail-grid">
        <article className="account-detail-panel">
          <h3>Strategy</h3>
          <p>{strategy.strategy || "No strategy details yet."}</p>
        </article>

        <article className="account-detail-panel">
          <h3>Rules</h3>
          <dl>
            <div>
              <dt>Entry rules</dt>
              <dd>{strategy.entryRules || "-"}</dd>
            </div>
            <div>
              <dt>SL and TP rules</dt>
              <dd>{strategy.slTpRules || "-"}</dd>
            </div>
            <div>
              <dt>Target plan</dt>
              <dd>{strategyTargetPlanLabel(strategy)}</dd>
            </div>
            <div>
              <dt>Invalidation rules</dt>
              <dd>{strategy.invalidationRules || "-"}</dd>
            </div>
          </dl>
        </article>

        <article className="account-detail-panel">
          <h3>Notes</h3>
          <p>{strategy.notes || "No notes yet."}</p>
        </article>

        <article className="account-detail-panel account-detail-panel-wide">
          <h3>Journal selectors</h3>
          <dl>
            <div>
              <dt>Instruments</dt>
              <dd>{strategy.currencyPairs.join(", ") || "-"}</dd>
            </div>
            <div>
              <dt>Key levels</dt>
              <dd>{strategy.keyLevels.join(", ") || "-"}</dd>
            </div>
            <div>
              <dt>Entry conditions</dt>
              <dd>{strategy.entryConditions.join(", ") || "-"}</dd>
            </div>
            <div>
              <dt>Exit conditions</dt>
              <dd>{strategy.exitConditions.join(", ") || "-"}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}

function EducatorDetailView({
  educator,
  strategies,
  actionError,
  onBack,
  onEdit,
  onDelete,
}: {
  educator: Educator;
  strategies: Strategy[];
  actionError: string | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const linkedStrategies = educator.strategyIds
    .map((strategyId) =>
      strategies.find((strategy) => strategy.id === strategyId),
    )
    .filter((strategy): strategy is Strategy => Boolean(strategy));

  return (
    <div className="account-module">
      <header className="account-detail-header">
        <button
          className="icon-button back-button"
          type="button"
          onClick={onBack}
          aria-label="Back to educators"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <h2>{educator.name}</h2>
          <p className="page-subtitle">Educator and community details.</p>
        </div>
        <DetailActions onEdit={onEdit} onDelete={onDelete} />
      </header>

      {actionError ? (
        <p className="account-action-error">{actionError}</p>
      ) : null}

      <section className="account-detail-grid">
        <article className="account-detail-panel">
          <h3>Educator</h3>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{educator.name}</dd>
            </div>
            <div>
              <dt>Community</dt>
              <dd>{educator.community || "Independent"}</dd>
            </div>
            <div>
              <dt>Strategies</dt>
              <dd>
                {linkedStrategies.length > 0
                  ? linkedStrategies.map((strategy) => strategy.name).join(", ")
                  : "No linked strategies"}
              </dd>
            </div>
          </dl>
        </article>
        <article className="account-detail-panel">
          <h3>Notes</h3>
          <p>{educator.notes || "No notes yet."}</p>
        </article>
      </section>
    </div>
  );
}

function RiskPlanDetailView({
  plan,
  actionError,
  onBack,
  onEdit,
  onDelete,
}: {
  plan: RiskManagementPlan;
  actionError: string | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="account-module">
      <header className="account-detail-header">
        <button
          className="icon-button back-button"
          type="button"
          onClick={onBack}
          aria-label="Back to risk management plans"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <h2>{plan.name}</h2>
          <p className="page-subtitle">Risk management plan details.</p>
        </div>
        <DetailActions onEdit={onEdit} onDelete={onDelete} />
      </header>

      {actionError ? (
        <p className="account-action-error">{actionError}</p>
      ) : null}

      <section className="account-detail-grid">
        <article className="account-detail-panel">
          <h3>Risk limits</h3>
          <dl>
            <div>
              <dt>Risk per trade</dt>
              <dd>
                {percentRangeValue(
                  plan.riskPerTradeMinPercent,
                  plan.riskPerTradeMaxPercent,
                )}
              </dd>
            </div>
            <div>
              <dt>Risk per day</dt>
              <dd>
                {percentTripleValue(
                  plan.riskPerDayMinPercent,
                  plan.riskPerDayMidPercent,
                  plan.riskPerDayMaxPercent,
                )}
              </dd>
            </div>
            <div>
              <dt>Risk per week</dt>
              <dd>
                {percentRangeValue(
                  plan.riskPerWeekMinPercent,
                  plan.riskPerWeekMaxPercent,
                )}
              </dd>
            </div>
          </dl>
        </article>

        <article className="account-detail-panel">
          <h3>Trade limits</h3>
          <dl>
            <div>
              <dt>Max trades per day</dt>
              <dd>{amountValue(plan.maxTradesPerDay)}</dd>
            </div>
            <div>
              <dt>Max losing trades/day</dt>
              <dd>{amountValue(plan.maxLosingTradesPerDay)}</dd>
            </div>
            <div>
              <dt>Max losing days row</dt>
              <dd>{amountValue(plan.maxLosingDaysInRow)}</dd>
            </div>
          </dl>
        </article>

        <article className="account-detail-panel">
          <h3>Goals</h3>
          <dl>
            <div>
              <dt>Daily goal</dt>
              <dd>
                {percentRangeValue(
                  plan.dailyGoalMinPercent,
                  plan.dailyGoalMaxPercent,
                )}
              </dd>
            </div>
            <div>
              <dt>Weekly goal</dt>
              <dd>
                {percentTripleValue(
                  plan.weeklyGoalMinPercent,
                  plan.weeklyGoalMidPercent,
                  plan.weeklyGoalMaxPercent,
                )}
              </dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{plan.notes || "-"}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}

function AccountDetailView({
  account,
  actionError,
  appPreferences,
  strategies,
  educators,
  riskPlans,
  onBack,
  onEdit,
  onDelete,
}: {
  account: TradingAccount;
  actionError: string | null;
  appPreferences: AppPreferences;
  strategies: Strategy[];
  educators: Educator[];
  riskPlans: RiskManagementPlan[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const strategyMap = new Map(
    strategies.map((strategy) => [strategy.id, strategy]),
  );
  const educatorMap = new Map(
    educators.map((educator) => [educator.id, educator]),
  );
  const riskPlan = account.riskPlanId
    ? (riskPlans.find((plan) => plan.id === account.riskPlanId) ?? null)
    : null;
  const linkedStrategies = account.strategyIds
    .map((id) => strategyMap.get(id))
    .filter((strategy): strategy is Strategy => Boolean(strategy));
  const linkedEducators = account.educatorIds
    .map((id) => educatorMap.get(id))
    .filter((educator): educator is Educator => Boolean(educator));

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
            {account.accountType === "system"
              ? "System Account details."
              : `${accountTypeLabel(account.accountType)} account details.`}
          </p>
        </div>
        <DetailActions onEdit={onEdit} onDelete={onDelete} />
      </header>

      {actionError ? (
        <p className="account-action-error">{actionError}</p>
      ) : null}

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
              <dd>
                {formatCurrencyValue(
                  account.startingBalance,
                  account.currency,
                  appPreferences,
                )}
              </dd>
            </div>
            <div>
              <dt>Commission</dt>
              <dd>
                {formatCurrencyValue(
                  account.commission,
                  account.currency,
                  appPreferences,
                )}
                /lot
              </dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{account.currency}</dd>
            </div>
          </dl>
        </article>

        {account.accountType === "system" ? (
          <article className="account-detail-panel">
            <h3>Educators</h3>
            {linkedEducators.length === 0 ? (
              <p>No educators connected.</p>
            ) : (
              <div className="account-detail-list">
                {linkedEducators.map((educator) => (
                  <div key={educator.id}>
                    <strong>{educator.name}</strong>
                    <span>{educator.community || "Independent educator"}</span>
                    <span>
                      Strategies:{" "}
                      {educator.strategyIds.length > 0
                        ? educator.strategyIds
                            .map(
                              (strategyId) =>
                                strategyMap.get(strategyId)?.name ||
                                "Unknown strategy",
                            )
                            .join(", ")
                        : "Not linked"}
                    </span>
                    {educator.notes ? <span>{educator.notes}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </article>
        ) : (
          <article className="account-detail-panel">
            <h3>Strategies</h3>
            {linkedStrategies.length === 0 ? (
              <p>No strategies connected.</p>
            ) : (
              <div className="account-detail-list">
                {linkedStrategies.map((strategy) => (
                  <div key={strategy.id}>
                    <strong>{strategy.name}</strong>
                    <span>
                      {strategy.strategy || "No strategy details yet."}
                    </span>
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
        )}

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
