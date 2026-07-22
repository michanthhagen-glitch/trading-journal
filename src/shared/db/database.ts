// Database layer for the Trading Journal.
// In Tauri we connect to SQLite. In browser mode we use in-memory data so
// layout work stays fast without opening the desktop shell.

import Database from "@tauri-apps/plugin-sql";
import { normalizeInstrumentSymbol } from "../tradeInstruments";
import { LIST_ACCOUNT_SETUP_STRATEGIES_SQL } from "./strategyQueries";
import {
  validateEducatorSetup,
  validateRiskPlanSetup,
  validateStrategySetup,
  validateTradingAccountSetup,
  type EducatorSetupInput,
  type RiskPlanSetupInput,
  type StrategySetupInput,
  type TradingAccountSetupInput,
} from "./accountSetupValidation";
import type {
  AccountEducatorRow,
  AccountStrategyRow,
  Educator,
  EducatorRow,
  EducatorStrategyRow,
  EntryData,
  ExitData,
  JournalRecapInput,
  JournalRecapRow,
  NewTrade,
  PreTradeData,
  RecapRow,
  RiskManagementPlan,
  RiskManagementPlanRow,
  ScreenshotRow,
  Strategy,
  StrategyRow,
  Trade,
  TradeRecap,
  TradeRecapInput,
  TradeRow,
  TradingAccount,
  TradingAccountRow,
} from "./models";
export type {
  AccountType,
  BacktestTarget,
  Educator,
  EducatorSetupInput,
  EntryData,
  ExitData,
  JournalRecapInput,
  JournalRecapRow,
  NewTrade,
  PreTradeData,
  RecapRow,
  RiskManagementPlan,
  RiskPlanSetupInput,
  ScreenshotRow,
  Strategy,
  StrategySetupInput,
  StrategyTargetMode,
  Trade,
  TradeRecap,
  TradeRecapGrade,
  TradeRecapInput,
  TradeRecapPlanFollowed,
  TradeResult,
  TradeRow,
  TradeStatus,
  TradingAccount,
  TradingAccountSetupInput,
} from "./models";

import {
  deriveStatus,
  normalizedPlanFollowed,
  normalizedRecapGrade,
  recapRowToRecap,
  rowToAccount,
  rowToEducator,
  rowToRiskPlan,
  rowToStrategy,
  rowToTrade,
} from "./rowMappers";

const DB_URL =
  import.meta.env.VITE_TRADING_JOURNAL_DB_URL ?? "sqlite:trading-journal.db";

function newTradeId() {
  return `T-${Date.now().toString().slice(-10)}`;
}

function newEntityId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const memoryTrades = new Map<string, Trade>();
const memoryStrategies = new Map<string, Strategy>();
const memoryEducators = new Map<string, Educator>();
const memoryRiskPlans = new Map<string, RiskManagementPlan>();
const memoryAccounts = new Map<string, TradingAccount>();

const SEED_TRADES: Trade[] = [
  {
    id: "T-128",
    accountId: "ACC-1",
    date: "2026-07-03",
    pair: "EURUSD",
    direction: "long",
    status: "closed",
    preTrade: {
      strategy: "London continuation",
      keyLevel: "Previous day high",
      entryCondition: "Retest confirmation",
      riskPercent: 1,
      riskAmount: 150,
      bias: "Long from 4H demand",
      notes: "Waited for 15m structure shift before entry.",
      feeling: 8,
    },
    entry: {
      time: "14:02",
      price: 1.0824,
      lotSize: 0.5,
      stopLoss: 1.0798,
      takeProfit: 1.0872,
      takeProfits: [1.0872],
      notes: "Clean retest with strong candle close.",
      confidence: 8,
    },
    exit: {
      price: 1.0872,
      result: "win",
      note: "Target hit. Followed plan.",
      feeling: 7,
      time: null,
      exitCondition: "Target reached",
    },
    pnl: 240,
    backtestSessionId: null,
    backtestTestedAt: null,
    backtestTargets: [],
    hasRecap: true,
    recap: {
      id: "R-128",
      tradeId: "T-128",
      grade: "A",
      followedPlan: "yes",
      setupQuality: 8,
      entryQuality: 8,
      managementQuality: 7,
      exitQuality: 8,
      mistakeTags: [],
      positiveTags: ["Followed plan", "Waited for confirmation"],
      emotionTag: "none",
      ruleBroken: false,
      lesson: "The best trades came after waiting for confirmation.",
      nextAction: "Keep using the same confirmation checklist.",
      body: "Target hit. Followed plan and waited for confirmation.",
      createdAt: "2026-07-03T18:00:00Z",
    },
    screenshots: [],
  },
  {
    id: "T-129",
    accountId: "ACC-1",
    date: "2026-07-03",
    pair: "XAUUSD",
    direction: "short",
    status: "open",
    preTrade: {
      strategy: "Supply rejection",
      keyLevel: "",
      entryCondition: "",
      riskPercent: 0.5,
      riskAmount: 100,
      bias: "Short from 2380 supply",
      notes: "News spike rejected. Waiting for continuation.",
      feeling: 6,
    },
    entry: {
      time: "16:45",
      price: 2378,
      lotSize: 0.2,
      stopLoss: 2395,
      takeProfit: 2350,
      takeProfits: [2350],
      notes: "Entered after 5m lower high.",
      confidence: 6,
    },
    exit: {
      price: null,
      result: "",
      note: "",
      feeling: null,
      time: null,
      exitCondition: "",
    },
    pnl: null,
    backtestSessionId: null,
    backtestTestedAt: null,
    backtestTargets: [],
    hasRecap: false,
    recap: null,
    screenshots: [],
  },
  {
    id: "T-127",
    accountId: "ACC-1",
    date: "2026-07-02",
    pair: "NAS100",
    direction: "long",
    status: "closed",
    preTrade: {
      strategy: "Breakout retest",
      keyLevel: "",
      entryCondition: "",
      riskPercent: 1,
      riskAmount: 150,
      bias: "Long above 19800",
      notes: "Setup was rushed. Should have waited for retest.",
      feeling: 4,
    },
    entry: {
      time: "10:05",
      price: 19812,
      lotSize: 1,
      stopLoss: 19762,
      takeProfit: 19920,
      takeProfits: [19920],
      notes: "FOMO entry into resistance.",
      confidence: 4,
    },
    exit: {
      price: 19762,
      result: "loss",
      note: "Stopped out. Entry was too early.",
      feeling: 3,
      time: null,
      exitCondition: "Structure invalidated",
    },
    pnl: -150,
    backtestSessionId: null,
    backtestTestedAt: null,
    backtestTargets: [],
    hasRecap: false,
    recap: null,
    screenshots: [],
  },
];

for (const trade of SEED_TRADES) memoryTrades.set(trade.id, trade);

const SEED_STRATEGIES: Strategy[] = [
  {
    id: "STR-1",
    name: "Mock strategy",
    strategy: "Default planning strategy for early workflow testing.",
    entryRules: "Wait for setup confirmation before entry.",
    slTpRules: "Place stop past invalidation and target at least 2R.",
    invalidationRules: "Skip when structure no longer supports the idea.",
    currencyPairs: ["EURUSD", "GBPUSD", "USDJPY"],
    keyLevels: ["Previous day high", "Previous day low"],
    entryConditions: ["Structure break", "Retest confirmation"],
    exitConditions: ["Target reached", "Structure invalidated"],
    targetMode: "custom",
    targetUnit: "price",
    fixedStopLoss: null,
    fixedTakeProfits: [],
    riskRewardGoal: null,
    notes: "Default planning strategy for early workflow testing.",
    created_at: "2026-07-03T00:00:00Z",
  },
];

const SEED_RISK_PLANS: RiskManagementPlan[] = [
  {
    id: "RISK-1",
    name: "1% fixed risk",
    riskPercent: 1,
    maxDailyLossPercent: 3,
    riskPerTradeMinPercent: 0.5,
    riskPerTradeMaxPercent: 1,
    riskPerDayMinPercent: 1,
    riskPerDayMidPercent: 2,
    riskPerDayMaxPercent: 3,
    riskPerWeekMinPercent: 2,
    riskPerWeekMaxPercent: 6,
    maxTradesPerDay: 3,
    maxLosingTradesPerDay: 2,
    maxLosingDaysInRow: 2,
    dailyGoalMinPercent: 1,
    dailyGoalMaxPercent: 2,
    weeklyGoalMinPercent: 3,
    weeklyGoalMidPercent: 5,
    weeklyGoalMaxPercent: 8,
    notes: "Simple starter plan for live-account examples.",
    created_at: "2026-07-03T00:00:00Z",
  },
];

const SEED_ACCOUNTS: TradingAccount[] = [
  {
    id: "ACC-1",
    name: "Main demo",
    startingBalance: 10000,
    commission: 0,
    currency: "USD",
    accountType: "demo",
    strategyIds: ["STR-1"],
    educatorIds: [],
    riskPlanId: "RISK-1",
    created_at: "2026-07-03T00:00:00Z",
  },
];

for (const strategy of SEED_STRATEGIES)
  memoryStrategies.set(strategy.id, strategy);
for (const plan of SEED_RISK_PLANS) memoryRiskPlans.set(plan.id, plan);
for (const account of SEED_ACCOUNTS) memoryAccounts.set(account.id, account);

let cachedDb: Database | null = null;
async function getDb(): Promise<Database> {
  if (cachedDb) return cachedDb;
  cachedDb = await Database.load(DB_URL);
  return cachedDb;
}

export function databaseFilename() {
  return DB_URL.replace(/^sqlite:/, "");
}

export async function closeDatabase(): Promise<void> {
  if (!isTauri() || !cachedDb) return;
  await cachedDb.close();
  cachedDb = null;
}

export async function initializeDatabase(): Promise<void> {
  if (!isTauri()) return;
  await getDb();
}

export async function listAccountSetup(): Promise<{
  accounts: TradingAccount[];
  strategies: Strategy[];
  educators: Educator[];
  riskPlans: RiskManagementPlan[];
}> {
  if (!isTauri()) {
    return {
      accounts: Array.from(memoryAccounts.values()),
      strategies: Array.from(memoryStrategies.values()),
      educators: Array.from(memoryEducators.values()),
      riskPlans: Array.from(memoryRiskPlans.values()),
    };
  }

  const db = await getDb();
  const strategyRows = (await db.select(
    LIST_ACCOUNT_SETUP_STRATEGIES_SQL,
  )) as StrategyRow[];
  const educatorRows = (await db.select(
    `SELECT id, name, community, notes, strategy_id, created_at
       FROM educators
      ORDER BY created_at DESC`,
  )) as EducatorRow[];
  const riskRows = (await db.select(
    `SELECT
        id,
        name,
        risk_percent,
        max_daily_loss_percent,
        risk_per_trade_min_percent,
        risk_per_trade_max_percent,
        risk_per_day_min_percent,
        risk_per_day_mid_percent,
        risk_per_day_max_percent,
        risk_per_week_min_percent,
        risk_per_week_max_percent,
        max_trades_per_day,
        max_losing_trades_per_day,
        max_losing_days_in_row,
        daily_goal_min_percent,
        daily_goal_max_percent,
        weekly_goal_min_percent,
        weekly_goal_mid_percent,
        weekly_goal_max_percent,
        notes,
        created_at
       FROM risk_management_plans
      ORDER BY created_at DESC`,
  )) as RiskManagementPlanRow[];
  const accountRows = (await db.select(
    `SELECT id, name, starting_balance, commission, currency, account_type, risk_plan_id, created_at
       FROM accounts
      ORDER BY created_at DESC`,
  )) as TradingAccountRow[];
  const links = (await db.select(
    "SELECT account_id, strategy_id FROM account_strategies",
  )) as AccountStrategyRow[];
  const educatorLinks = (await db.select(
    "SELECT account_id, educator_id FROM account_educators",
  )) as AccountEducatorRow[];
  const educatorStrategyLinks = (await db.select(
    "SELECT educator_id, strategy_id FROM educator_strategies",
  )) as EducatorStrategyRow[];

  const strategiesByAccount = new Map<string, string[]>();
  for (const link of links) {
    const ids = strategiesByAccount.get(link.account_id) ?? [];
    ids.push(link.strategy_id);
    strategiesByAccount.set(link.account_id, ids);
  }
  const educatorsByAccount = new Map<string, string[]>();
  for (const link of educatorLinks) {
    const ids = educatorsByAccount.get(link.account_id) ?? [];
    ids.push(link.educator_id);
    educatorsByAccount.set(link.account_id, ids);
  }
  const strategiesByEducator = new Map<string, string[]>();
  for (const link of educatorStrategyLinks) {
    const ids = strategiesByEducator.get(link.educator_id) ?? [];
    ids.push(link.strategy_id);
    strategiesByEducator.set(link.educator_id, ids);
  }

  return {
    accounts: accountRows.map((row) =>
      rowToAccount(
        row,
        strategiesByAccount.get(row.id) ?? [],
        educatorsByAccount.get(row.id) ?? [],
      ),
    ),
    strategies: strategyRows.map(rowToStrategy),
    educators: educatorRows.map((row) =>
      rowToEducator(row, strategiesByEducator.get(row.id) ?? []),
    ),
    riskPlans: riskRows.map(rowToRiskPlan),
  };
}

export async function createStrategy(
  input: StrategySetupInput,
): Promise<Strategy> {
  validateStrategySetup(input);
  const name = input.name.trim();

  const row: Strategy = {
    id: newEntityId("STR"),
    name,
    strategy: input.strategy.trim(),
    entryRules: input.entryRules.trim(),
    slTpRules: input.slTpRules.trim(),
    invalidationRules: input.invalidationRules.trim(),
    currencyPairs: Array.from(
      new Set(
        input.currencyPairs.map(normalizeInstrumentSymbol).filter(Boolean),
      ),
    ),
    keyLevels: input.keyLevels.map((value) => value.trim()).filter(Boolean),
    entryConditions: input.entryConditions
      .map((value) => value.trim())
      .filter(Boolean),
    exitConditions: input.exitConditions
      .map((value) => value.trim())
      .filter(Boolean),
    targetMode: input.targetMode,
    targetUnit: input.targetUnit,
    fixedStopLoss: input.targetMode === "fixed" ? input.fixedStopLoss : null,
    fixedTakeProfits:
      input.targetMode === "fixed" ? input.fixedTakeProfits : [],
    riskRewardGoal:
      input.targetMode === "risk-reward" ? input.riskRewardGoal : null,
    notes: input.strategy.trim(),
    created_at: new Date().toISOString(),
  };

  if (!isTauri()) {
    memoryStrategies.set(row.id, row);
    return row;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO strategies
       (id, name, strategy, entry_rules, sl_tp_rules, invalidation_rules,
         currency_pairs, key_levels, entry_conditions, exit_conditions,
         target_plan_mode, target_unit, fixed_stop_loss, fixed_take_profits,
         risk_reward_goal, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      row.id,
      row.name,
      row.strategy,
      row.entryRules,
      row.slTpRules,
      row.invalidationRules,
      JSON.stringify(row.currencyPairs),
      JSON.stringify(row.keyLevels),
      JSON.stringify(row.entryConditions),
      JSON.stringify(row.exitConditions),
      row.targetMode,
      row.targetUnit,
      row.fixedStopLoss,
      JSON.stringify(row.fixedTakeProfits),
      row.riskRewardGoal,
      row.notes,
    ],
  );
  return row;
}

export async function createEducator(
  input: EducatorSetupInput,
): Promise<Educator> {
  validateEducatorSetup(input);
  const row: Educator = {
    id: newEntityId("EDU"),
    name: input.name.trim(),
    community: input.community.trim(),
    notes: input.notes.trim(),
    strategyIds: Array.from(new Set(input.strategyIds.filter(Boolean))),
    created_at: new Date().toISOString(),
  };

  if (!isTauri()) {
    memoryEducators.set(row.id, row);
    return row;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO educators (id, name, community, notes, strategy_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [row.id, row.name, row.community, row.notes, row.strategyIds[0] ?? null],
  );
  for (const strategyId of row.strategyIds) {
    await db.execute(
      "INSERT INTO educator_strategies (educator_id, strategy_id) VALUES ($1, $2)",
      [row.id, strategyId],
    );
  }
  return row;
}

export async function createRiskManagementPlan(
  input: RiskPlanSetupInput,
): Promise<RiskManagementPlan> {
  validateRiskPlanSetup(input);
  const name = input.name.trim();

  const row: RiskManagementPlan = {
    id: newEntityId("RISK"),
    name,
    riskPercent: input.riskPerTradeMaxPercent,
    maxDailyLossPercent: input.riskPerDayMaxPercent,
    riskPerTradeMinPercent: input.riskPerTradeMinPercent,
    riskPerTradeMaxPercent: input.riskPerTradeMaxPercent,
    riskPerDayMinPercent: input.riskPerDayMinPercent,
    riskPerDayMidPercent: input.riskPerDayMidPercent,
    riskPerDayMaxPercent: input.riskPerDayMaxPercent,
    riskPerWeekMinPercent: input.riskPerWeekMinPercent,
    riskPerWeekMaxPercent: input.riskPerWeekMaxPercent,
    maxTradesPerDay: input.maxTradesPerDay,
    maxLosingTradesPerDay: input.maxLosingTradesPerDay,
    maxLosingDaysInRow: input.maxLosingDaysInRow,
    dailyGoalMinPercent: input.dailyGoalMinPercent,
    dailyGoalMaxPercent: input.dailyGoalMaxPercent,
    weeklyGoalMinPercent: input.weeklyGoalMinPercent,
    weeklyGoalMidPercent: input.weeklyGoalMidPercent,
    weeklyGoalMaxPercent: input.weeklyGoalMaxPercent,
    notes: input.notes.trim(),
    created_at: new Date().toISOString(),
  };

  if (!isTauri()) {
    memoryRiskPlans.set(row.id, row);
    return row;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO risk_management_plans
       (
        id,
        name,
        risk_percent,
        max_daily_loss_percent,
        risk_per_trade_min_percent,
        risk_per_trade_max_percent,
        risk_per_day_min_percent,
        risk_per_day_mid_percent,
        risk_per_day_max_percent,
        risk_per_week_min_percent,
        risk_per_week_max_percent,
        max_trades_per_day,
        max_losing_trades_per_day,
        max_losing_days_in_row,
        daily_goal_min_percent,
        daily_goal_max_percent,
        weekly_goal_min_percent,
        weekly_goal_mid_percent,
        weekly_goal_max_percent,
        notes
       )
     VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20
       )`,
    [
      row.id,
      row.name,
      row.riskPercent,
      row.maxDailyLossPercent,
      row.riskPerTradeMinPercent,
      row.riskPerTradeMaxPercent,
      row.riskPerDayMinPercent,
      row.riskPerDayMidPercent,
      row.riskPerDayMaxPercent,
      row.riskPerWeekMinPercent,
      row.riskPerWeekMaxPercent,
      row.maxTradesPerDay,
      row.maxLosingTradesPerDay,
      row.maxLosingDaysInRow,
      row.dailyGoalMinPercent,
      row.dailyGoalMaxPercent,
      row.weeklyGoalMinPercent,
      row.weeklyGoalMidPercent,
      row.weeklyGoalMaxPercent,
      row.notes,
    ],
  );
  return row;
}

export async function createTradingAccount(
  input: TradingAccountSetupInput,
): Promise<TradingAccount> {
  validateTradingAccountSetup(input);
  const name = input.name.trim();
  const strategyIds =
    input.accountType === "system"
      ? []
      : Array.from(new Set(input.strategyIds.filter(Boolean)));
  const educatorIds =
    input.accountType === "system"
      ? Array.from(new Set(input.educatorIds.filter(Boolean)))
      : [];
  const riskPlanId =
    input.accountType === "backtesting" ? null : input.riskPlanId || null;

  const row: TradingAccount = {
    id: newEntityId("ACC"),
    name,
    startingBalance: input.startingBalance,
    commission: input.commission,
    currency: input.currency.trim().toUpperCase(),
    accountType: input.accountType,
    strategyIds,
    educatorIds,
    riskPlanId,
    created_at: new Date().toISOString(),
  };

  if (!isTauri()) {
    memoryAccounts.set(row.id, row);
    return row;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO accounts
       (id, name, starting_balance, commission, currency, account_type, risk_plan_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      row.id,
      row.name,
      row.startingBalance,
      row.commission,
      row.currency,
      row.accountType,
      row.riskPlanId,
    ],
  );

  for (const strategyId of row.strategyIds) {
    await db.execute(
      "INSERT INTO account_strategies (account_id, strategy_id) VALUES ($1, $2)",
      [row.id, strategyId],
    );
  }
  for (const educatorId of row.educatorIds) {
    await db.execute(
      "INSERT INTO account_educators (account_id, educator_id) VALUES ($1, $2)",
      [row.id, educatorId],
    );
  }

  return row;
}

export async function updateStrategy(
  id: string,
  input: StrategySetupInput,
): Promise<Strategy> {
  validateStrategySetup(input);
  const current = memoryStrategies.get(id);
  const row: Strategy = {
    id,
    name: input.name.trim(),
    strategy: input.strategy.trim(),
    entryRules: input.entryRules.trim(),
    slTpRules: input.slTpRules.trim(),
    invalidationRules: input.invalidationRules.trim(),
    currencyPairs: Array.from(
      new Set(
        input.currencyPairs.map(normalizeInstrumentSymbol).filter(Boolean),
      ),
    ),
    keyLevels: input.keyLevels.map((value) => value.trim()).filter(Boolean),
    entryConditions: input.entryConditions
      .map((value) => value.trim())
      .filter(Boolean),
    exitConditions: input.exitConditions
      .map((value) => value.trim())
      .filter(Boolean),
    targetMode: input.targetMode,
    targetUnit: input.targetUnit,
    fixedStopLoss: input.targetMode === "fixed" ? input.fixedStopLoss : null,
    fixedTakeProfits:
      input.targetMode === "fixed" ? input.fixedTakeProfits : [],
    riskRewardGoal:
      input.targetMode === "risk-reward" ? input.riskRewardGoal : null,
    notes: input.strategy.trim(),
    created_at: current?.created_at ?? new Date().toISOString(),
  };

  if (!isTauri()) {
    if (!current) throw new Error("Strategy was not found.");
    memoryStrategies.set(id, row);
    return row;
  }

  const db = await getDb();
  const result = await db.execute(
    `UPDATE strategies
        SET name = $1,
            strategy = $2,
            entry_rules = $3,
            sl_tp_rules = $4,
            invalidation_rules = $5,
            currency_pairs = $6,
            key_levels = $7,
             entry_conditions = $8,
             exit_conditions = $9,
             target_plan_mode = $10,
             target_unit = $11,
             fixed_stop_loss = $12,
             fixed_take_profits = $13,
             risk_reward_goal = $14,
             notes = $15,
             updated_at = datetime('now')
       WHERE id = $16`,
    [
      row.name,
      row.strategy,
      row.entryRules,
      row.slTpRules,
      row.invalidationRules,
      JSON.stringify(row.currencyPairs),
      JSON.stringify(row.keyLevels),
      JSON.stringify(row.entryConditions),
      JSON.stringify(row.exitConditions),
      row.targetMode,
      row.targetUnit,
      row.fixedStopLoss,
      JSON.stringify(row.fixedTakeProfits),
      row.riskRewardGoal,
      row.notes,
      id,
    ],
  );
  if (result.rowsAffected === 0) throw new Error("Strategy was not found.");
  return row;
}

export async function deleteStrategy(id: string): Promise<void> {
  if (!isTauri()) {
    const linkedAccount = Array.from(memoryAccounts.values()).find((account) =>
      account.strategyIds.includes(id),
    );
    if (linkedAccount) {
      throw new Error(
        `Remove this strategy from ${linkedAccount.name} before deleting it.`,
      );
    }
    const linkedEducator = Array.from(memoryEducators.values()).find(
      (educator) => educator.strategyIds.includes(id),
    );
    if (linkedEducator) {
      throw new Error(
        `Remove this strategy from ${linkedEducator.name} before deleting it.`,
      );
    }
    memoryStrategies.delete(id);
    return;
  }

  const db = await getDb();
  const links = (await db.select(
    `SELECT a.name
       FROM account_strategies link
       JOIN accounts a ON a.id = link.account_id
      WHERE link.strategy_id = $1
      LIMIT 1`,
    [id],
  )) as { name: string }[];
  if (links[0]) {
    throw new Error(
      `Remove this strategy from ${links[0].name} before deleting it.`,
    );
  }
  const educatorLinks = (await db.select(
    `SELECT e.name
       FROM educator_strategies link
       JOIN educators e ON e.id = link.educator_id
      WHERE link.strategy_id = $1
      LIMIT 1`,
    [id],
  )) as { name: string }[];
  if (educatorLinks[0]) {
    throw new Error(
      `Remove this strategy from ${educatorLinks[0].name} before deleting it.`,
    );
  }
  await db.execute("DELETE FROM strategies WHERE id = $1", [id]);
}

export async function updateEducator(
  id: string,
  input: EducatorSetupInput,
): Promise<Educator> {
  validateEducatorSetup(input);
  const current = memoryEducators.get(id);
  const row: Educator = {
    id,
    name: input.name.trim(),
    community: input.community.trim(),
    notes: input.notes.trim(),
    strategyIds: Array.from(new Set(input.strategyIds.filter(Boolean))),
    created_at: current?.created_at ?? new Date().toISOString(),
  };

  if (!isTauri()) {
    if (!current) throw new Error("Educator was not found.");
    memoryEducators.set(id, row);
    return row;
  }

  const db = await getDb();
  const result = await db.execute(
    `UPDATE educators
        SET name = $1,
            community = $2,
            notes = $3,
            strategy_id = $4,
            updated_at = datetime('now')
      WHERE id = $5`,
    [row.name, row.community, row.notes, row.strategyIds[0] ?? null, id],
  );
  if (result.rowsAffected === 0) throw new Error("Educator was not found.");
  await db.execute("DELETE FROM educator_strategies WHERE educator_id = $1", [
    id,
  ]);
  for (const strategyId of row.strategyIds) {
    await db.execute(
      "INSERT INTO educator_strategies (educator_id, strategy_id) VALUES ($1, $2)",
      [id, strategyId],
    );
  }
  return row;
}

export async function deleteEducator(id: string): Promise<void> {
  if (!isTauri()) {
    const linkedAccount = Array.from(memoryAccounts.values()).find((account) =>
      account.educatorIds.includes(id),
    );
    if (linkedAccount) {
      throw new Error(
        `Remove this educator from ${linkedAccount.name} before deleting them.`,
      );
    }
    memoryEducators.delete(id);
    return;
  }

  const db = await getDb();
  const links = (await db.select(
    `SELECT a.name
       FROM account_educators link
       JOIN accounts a ON a.id = link.account_id
      WHERE link.educator_id = $1
      LIMIT 1`,
    [id],
  )) as { name: string }[];
  if (links[0]) {
    throw new Error(
      `Remove this educator from ${links[0].name} before deleting them.`,
    );
  }
  await db.execute("DELETE FROM educators WHERE id = $1", [id]);
}

function riskPlanFromInput(
  id: string,
  input: RiskPlanSetupInput,
  createdAt: string,
): RiskManagementPlan {
  return {
    id,
    name: input.name.trim(),
    riskPercent: input.riskPerTradeMaxPercent,
    maxDailyLossPercent: input.riskPerDayMaxPercent,
    riskPerTradeMinPercent: input.riskPerTradeMinPercent,
    riskPerTradeMaxPercent: input.riskPerTradeMaxPercent,
    riskPerDayMinPercent: input.riskPerDayMinPercent,
    riskPerDayMidPercent: input.riskPerDayMidPercent,
    riskPerDayMaxPercent: input.riskPerDayMaxPercent,
    riskPerWeekMinPercent: input.riskPerWeekMinPercent,
    riskPerWeekMaxPercent: input.riskPerWeekMaxPercent,
    maxTradesPerDay: input.maxTradesPerDay,
    maxLosingTradesPerDay: input.maxLosingTradesPerDay,
    maxLosingDaysInRow: input.maxLosingDaysInRow,
    dailyGoalMinPercent: input.dailyGoalMinPercent,
    dailyGoalMaxPercent: input.dailyGoalMaxPercent,
    weeklyGoalMinPercent: input.weeklyGoalMinPercent,
    weeklyGoalMidPercent: input.weeklyGoalMidPercent,
    weeklyGoalMaxPercent: input.weeklyGoalMaxPercent,
    notes: input.notes.trim(),
    created_at: createdAt,
  };
}

export async function updateRiskManagementPlan(
  id: string,
  input: RiskPlanSetupInput,
): Promise<RiskManagementPlan> {
  validateRiskPlanSetup(input);
  const current = memoryRiskPlans.get(id);
  const row = riskPlanFromInput(
    id,
    input,
    current?.created_at ?? new Date().toISOString(),
  );

  if (!isTauri()) {
    if (!current) throw new Error("Risk plan was not found.");
    memoryRiskPlans.set(id, row);
    return row;
  }

  const db = await getDb();
  const result = await db.execute(
    `UPDATE risk_management_plans
        SET name = $1,
            risk_percent = $2,
            max_daily_loss_percent = $3,
            risk_per_trade_min_percent = $4,
            risk_per_trade_max_percent = $5,
            risk_per_day_min_percent = $6,
            risk_per_day_mid_percent = $7,
            risk_per_day_max_percent = $8,
            risk_per_week_min_percent = $9,
            risk_per_week_max_percent = $10,
            max_trades_per_day = $11,
            max_losing_trades_per_day = $12,
            max_losing_days_in_row = $13,
            daily_goal_min_percent = $14,
            daily_goal_max_percent = $15,
            weekly_goal_min_percent = $16,
            weekly_goal_mid_percent = $17,
            weekly_goal_max_percent = $18,
            notes = $19,
            updated_at = datetime('now')
      WHERE id = $20`,
    [
      row.name,
      row.riskPercent,
      row.maxDailyLossPercent,
      row.riskPerTradeMinPercent,
      row.riskPerTradeMaxPercent,
      row.riskPerDayMinPercent,
      row.riskPerDayMidPercent,
      row.riskPerDayMaxPercent,
      row.riskPerWeekMinPercent,
      row.riskPerWeekMaxPercent,
      row.maxTradesPerDay,
      row.maxLosingTradesPerDay,
      row.maxLosingDaysInRow,
      row.dailyGoalMinPercent,
      row.dailyGoalMaxPercent,
      row.weeklyGoalMinPercent,
      row.weeklyGoalMidPercent,
      row.weeklyGoalMaxPercent,
      row.notes,
      id,
    ],
  );
  if (result.rowsAffected === 0) throw new Error("Risk plan was not found.");
  return row;
}

export async function deleteRiskManagementPlan(id: string): Promise<void> {
  if (!isTauri()) {
    const linkedAccount = Array.from(memoryAccounts.values()).find(
      (account) => account.riskPlanId === id,
    );
    if (linkedAccount) {
      throw new Error(
        `Choose another risk plan for ${linkedAccount.name} before deleting it.`,
      );
    }
    memoryRiskPlans.delete(id);
    return;
  }

  const db = await getDb();
  const links = (await db.select(
    "SELECT name FROM accounts WHERE risk_plan_id = $1 LIMIT 1",
    [id],
  )) as { name: string }[];
  if (links[0]) {
    throw new Error(
      `Choose another risk plan for ${links[0].name} before deleting it.`,
    );
  }
  await db.execute("DELETE FROM risk_management_plans WHERE id = $1", [id]);
}

export async function updateTradingAccount(
  id: string,
  input: TradingAccountSetupInput,
): Promise<TradingAccount> {
  validateTradingAccountSetup(input);
  const strategyIds =
    input.accountType === "system"
      ? []
      : Array.from(new Set(input.strategyIds.filter(Boolean)));
  const educatorIds =
    input.accountType === "system"
      ? Array.from(new Set(input.educatorIds.filter(Boolean)))
      : [];
  const riskPlanId =
    input.accountType === "backtesting" ? null : input.riskPlanId || null;
  const current = memoryAccounts.get(id);
  const row: TradingAccount = {
    id,
    name: input.name.trim(),
    startingBalance: input.startingBalance,
    commission: input.commission,
    currency: input.currency.trim().toUpperCase(),
    accountType: input.accountType,
    strategyIds,
    educatorIds,
    riskPlanId,
    created_at: current?.created_at ?? new Date().toISOString(),
  };

  if (!isTauri()) {
    if (!current) throw new Error("Account was not found.");
    memoryAccounts.set(id, row);
    return row;
  }

  const db = await getDb();
  const result = await db.execute(
    `UPDATE accounts
        SET name = $1,
            starting_balance = $2,
            commission = $3,
            currency = $4,
            account_type = $5,
            risk_plan_id = $6,
            updated_at = datetime('now')
      WHERE id = $7`,
    [
      row.name,
      row.startingBalance,
      row.commission,
      row.currency,
      row.accountType,
      row.riskPlanId,
      id,
    ],
  );
  if (result.rowsAffected === 0) throw new Error("Account was not found.");
  await db.execute("DELETE FROM account_strategies WHERE account_id = $1", [
    id,
  ]);
  for (const strategyId of row.strategyIds) {
    await db.execute(
      "INSERT INTO account_strategies (account_id, strategy_id) VALUES ($1, $2)",
      [id, strategyId],
    );
  }
  await db.execute("DELETE FROM account_educators WHERE account_id = $1", [id]);
  for (const educatorId of row.educatorIds) {
    await db.execute(
      "INSERT INTO account_educators (account_id, educator_id) VALUES ($1, $2)",
      [id, educatorId],
    );
  }
  return row;
}

export async function deleteTradingAccount(id: string): Promise<void> {
  if (!isTauri()) {
    for (const [tradeId, trade] of memoryTrades.entries()) {
      if (trade.accountId === id) memoryTrades.delete(tradeId);
    }
    for (const rows of Object.values(SEED_JOURNAL)) {
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (rows[index].account_id === id) rows.splice(index, 1);
      }
    }
    memoryAccounts.delete(id);
    return;
  }

  const db = await getDb();
  await db.execute(
    `DELETE FROM screenshots
      WHERE trade_id IN (SELECT id FROM trades WHERE account_id = $1)`,
    [id],
  );
  await db.execute(
    `DELETE FROM recaps
      WHERE trade_id IN (SELECT id FROM trades WHERE account_id = $1)`,
    [id],
  );
  await db.execute("DELETE FROM trades WHERE account_id = $1", [id]);
  await db.execute("DELETE FROM journal_recaps WHERE account_id = $1", [id]);
  await db.execute("DELETE FROM account_strategies WHERE account_id = $1", [
    id,
  ]);
  await db.execute("DELETE FROM account_educators WHERE account_id = $1", [id]);
  await db.execute("DELETE FROM accounts WHERE id = $1", [id]);
}

export async function listTrades(accountId?: string | null): Promise<Trade[]> {
  if (!isTauri()) {
    return Array.from(memoryTrades.values())
      .filter((trade) => !accountId || trade.accountId === accountId)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  const db = await getDb();
  const rows = (await db.select(
    `SELECT *
       FROM trades
      WHERE $1 IS NULL OR account_id = $1
      ORDER BY trade_date DESC, created_at DESC`,
    [accountId ?? null],
  )) as TradeRow[];
  const recapRows = (await db.select(
    "SELECT * FROM recaps ORDER BY created_at DESC",
  )) as RecapRow[];
  const screenshotRows = (await db.select(
    "SELECT * FROM screenshots ORDER BY created_at ASC",
  )) as ScreenshotRow[];

  const recapsByTrade = new Map<string, TradeRecap>();
  for (const row of recapRows) {
    if (!recapsByTrade.has(row.trade_id)) {
      recapsByTrade.set(row.trade_id, recapRowToRecap(row));
    }
  }

  const shotsByTrade = new Map<string, ScreenshotRow[]>();
  for (const screenshot of screenshotRows) {
    const screenshots = shotsByTrade.get(screenshot.trade_id) ?? [];
    screenshots.push(screenshot);
    shotsByTrade.set(screenshot.trade_id, screenshots);
  }

  return rows.map((row) =>
    rowToTrade(
      row,
      recapsByTrade.get(row.id) ?? null,
      shotsByTrade.get(row.id) ?? [],
    ),
  );
}

export async function insertTrade(input: NewTrade): Promise<Trade> {
  const id = newTradeId();
  const trade: Trade = {
    ...input,
    id,
    accountId: input.accountId ?? null,
    status: deriveStatus(input),
    hasRecap: false,
    recap: null,
    screenshots: [],
  };

  if (!isTauri()) {
    memoryTrades.set(id, trade);
    return trade;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO trades (
      id, account_id, trade_date, pair, direction, status,
      pre_thesis, pre_levels, pre_confluences,
      pre_trend, pre_key_levels, pre_bias, pre_notes, pre_feeling,
      pre_strategy, risk_percent, risk_amount,
      entry_price, entry_size, entry_time, stop_loss, take_profit,
      entry_notes, entry_confidence,
      exit_price, exit_time, exit_reason, exit_result, exit_feeling,
      pnl, key_level, entry_condition, exit_condition,
       backtest_session_id, backtest_tested_at, backtest_targets,
       take_profit_targets
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,
      $10,$11,$12,$13,$14,
      $15,$16,$17,
      $18,$19,$20,$21,$22,
      $23,$24,
      $25,$26,$27,$28,$29,
      $30,$31,$32,$33,
       $34,$35,$36,$37
    )`,
    [
      trade.id,
      trade.accountId,
      trade.date,
      trade.pair,
      trade.direction,
      trade.status,
      "",
      "",
      "",
      "",
      "",
      trade.preTrade.bias,
      trade.preTrade.notes,
      trade.preTrade.feeling,
      trade.preTrade.strategy,
      trade.preTrade.riskPercent,
      trade.preTrade.riskAmount,
      trade.entry.price,
      trade.entry.lotSize,
      trade.entry.time,
      trade.entry.stopLoss,
      trade.entry.takeProfit,
      trade.entry.notes,
      trade.entry.confidence,
      trade.exit.price,
      trade.exit.time,
      trade.exit.note,
      trade.exit.result,
      trade.exit.feeling,
      trade.pnl,
      trade.preTrade.keyLevel,
      trade.preTrade.entryCondition,
      trade.exit.exitCondition,
      trade.backtestSessionId,
      trade.backtestTestedAt,
      JSON.stringify(trade.backtestTargets),
      JSON.stringify(trade.entry.takeProfits),
    ],
  );
  return trade;
}

export async function savePreTrade(
  tradeId: string,
  data: PreTradeData,
): Promise<void> {
  if (!isTauri()) {
    const trade = memoryTrades.get(tradeId);
    if (!trade) return;
    memoryTrades.set(tradeId, { ...trade, preTrade: data });
    return;
  }

  const db = await getDb();
  await db.execute(
    `UPDATE trades SET
       pre_bias = $1,
       pre_notes = $2,
       pre_feeling = $3,
       pre_strategy = $4,
       risk_percent = $5,
       risk_amount = $6,
       key_level = $7,
       entry_condition = $8,
       updated_at = datetime('now')
     WHERE id = $9`,
    [
      data.bias,
      data.notes,
      data.feeling,
      data.strategy,
      data.riskPercent,
      data.riskAmount,
      data.keyLevel,
      data.entryCondition,
      tradeId,
    ],
  );
}

export async function saveEntry(
  tradeId: string,
  entry: EntryData,
  direction: Trade["direction"],
): Promise<void> {
  if (!isTauri()) {
    const trade = memoryTrades.get(tradeId);
    if (!trade) return;
    memoryTrades.set(tradeId, {
      ...trade,
      direction,
      entry,
      status: trade.status === "pre-trade" ? "open" : trade.status,
    });
    return;
  }

  const db = await getDb();
  await db.execute(
    `UPDATE trades SET
       direction = $1,
       entry_time = $2,
       entry_price = $3,
       entry_size = $4,
       stop_loss = $5,
       take_profit = $6,
       take_profit_targets = $7,
       entry_notes = $8,
       entry_confidence = $9,
       status = CASE WHEN status = 'pre-trade' THEN 'open' ELSE status END,
       updated_at = datetime('now')
     WHERE id = $10`,
    [
      direction,
      entry.time,
      entry.price,
      entry.lotSize,
      entry.stopLoss,
      entry.takeProfit,
      JSON.stringify(entry.takeProfits),
      entry.notes,
      entry.confidence,
      tradeId,
    ],
  );
}

export async function closeTrade(
  id: string,
  exit: ExitData,
  pnl: number | null,
): Promise<void> {
  if (!isTauri()) {
    const trade = memoryTrades.get(id);
    if (!trade) return;
    memoryTrades.set(id, {
      ...trade,
      exit,
      pnl,
      status: "closed",
    });
    return;
  }

  const db = await getDb();
  await db.execute(
    `UPDATE trades
       SET exit_price = $1,
           exit_time = $2,
           exit_reason = $3,
           exit_result = $4,
           exit_feeling = $5,
           pnl = $6,
           exit_condition = $7,
           status = 'closed',
           updated_at = datetime('now')
     WHERE id = $8`,
    [
      exit.price,
      exit.time,
      exit.note,
      exit.result,
      exit.feeling,
      pnl,
      exit.exitCondition,
      id,
    ],
  );
}

export async function deleteTrade(id: string): Promise<void> {
  if (!isTauri()) {
    memoryTrades.delete(id);
    return;
  }

  const db = await getDb();
  await db.execute("DELETE FROM trades WHERE id = $1", [id]);
}

const EMPTY_TRADE_RECAP_INPUT: TradeRecapInput = {
  grade: "",
  followedPlan: "",
  setupQuality: null,
  entryQuality: null,
  managementQuality: null,
  exitQuality: null,
  mistakeTags: [],
  positiveTags: [],
  emotionTag: "",
  ruleBroken: false,
  lesson: "",
  nextAction: "",
  body: "",
};

function normalizeRecapInput(input: TradeRecapInput | string): TradeRecapInput {
  if (typeof input === "string") {
    return { ...EMPTY_TRADE_RECAP_INPUT, body: input.trim() };
  }

  return {
    grade: normalizedRecapGrade(input.grade),
    followedPlan: normalizedPlanFollowed(input.followedPlan),
    setupQuality: input.setupQuality,
    entryQuality: input.entryQuality,
    managementQuality: input.managementQuality,
    exitQuality: input.exitQuality,
    mistakeTags: Array.from(
      new Set(input.mistakeTags.map((tag) => tag.trim()).filter(Boolean)),
    ),
    positiveTags: Array.from(
      new Set(input.positiveTags.map((tag) => tag.trim()).filter(Boolean)),
    ),
    emotionTag: input.emotionTag.trim(),
    ruleBroken: input.ruleBroken,
    lesson: input.lesson.trim(),
    nextAction: input.nextAction.trim(),
    body: input.body.trim(),
  };
}

export async function saveRecap(
  tradeId: string,
  input: TradeRecapInput | string,
): Promise<void> {
  const id = `R-${Date.now().toString().slice(-10)}`;
  const recapInput = normalizeRecapInput(input);

  if (!isTauri()) {
    const trade = memoryTrades.get(tradeId);
    if (trade)
      memoryTrades.set(tradeId, {
        ...trade,
        hasRecap: true,
        recap: {
          ...recapInput,
          id,
          tradeId,
          createdAt: new Date().toISOString(),
        },
        status: "reviewed",
      });
    return;
  }

  const db = await getDb();
  await db.execute("DELETE FROM recaps WHERE trade_id = $1", [tradeId]);
  await db.execute(
    `INSERT INTO recaps (
       id,
       trade_id,
       body,
       grade,
       followed_plan,
       setup_quality,
       entry_quality,
       management_quality,
       exit_quality,
       mistake_tags,
       positive_tags,
       emotion_tag,
       rule_broken,
       lesson,
       next_action
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15
     )`,
    [
      id,
      tradeId,
      recapInput.body,
      recapInput.grade,
      recapInput.followedPlan,
      recapInput.setupQuality,
      recapInput.entryQuality,
      recapInput.managementQuality,
      recapInput.exitQuality,
      JSON.stringify(recapInput.mistakeTags),
      JSON.stringify(recapInput.positiveTags),
      recapInput.emotionTag,
      recapInput.ruleBroken ? 1 : 0,
      recapInput.lesson,
      recapInput.nextAction,
    ],
  );
  await db.execute(
    `UPDATE trades SET status = 'reviewed', updated_at = datetime('now') WHERE id = $1`,
    [tradeId],
  );
}

export async function listJournalRecaps(
  cadence: JournalRecapRow["cadence"],
  accountId?: string | null,
): Promise<JournalRecapRow[]> {
  if (!isTauri()) {
    return SEED_JOURNAL[cadence].filter(
      (recap) => !accountId || recap.account_id === accountId,
    );
  }

  const db = await getDb();
  return (await db.select(
    `SELECT *
       FROM journal_recaps
      WHERE cadence = $1
        AND ($2 IS NULL OR account_id = $2)
      ORDER BY created_at DESC`,
    [cadence, accountId ?? null],
  )) as JournalRecapRow[];
}

export async function saveJournalRecap(
  input: JournalRecapInput,
): Promise<JournalRecapRow> {
  const title = input.title.trim();
  const body = input.body.trim();
  const period = input.period.trim();
  const row: JournalRecapRow = {
    id: input.id ?? newEntityId("JRN"),
    account_id: input.accountId ?? null,
    cadence: input.cadence,
    title,
    period,
    body,
    created_at: new Date().toISOString(),
  };

  if (!title) throw new Error("Recap title is required.");
  if (!period) throw new Error("Recap period is required.");

  if (!isTauri()) {
    const rows = SEED_JOURNAL[row.cadence];
    const index = rows.findIndex((recap) => recap.id === row.id);
    if (index >= 0) {
      rows[index] = {
        ...rows[index],
        ...row,
        created_at: rows[index].created_at,
      };
    } else {
      rows.unshift(row);
    }
    return index >= 0 ? rows[index] : row;
  }

  const db = await getDb();
  if (input.id) {
    await db.execute(
      `UPDATE journal_recaps
          SET account_id = $1,
              cadence = $2,
              title = $3,
              period = $4,
              body = $5
        WHERE id = $6`,
      [row.account_id, row.cadence, row.title, row.period, row.body, row.id],
    );
  } else {
    await db.execute(
      `INSERT INTO journal_recaps
         (id, account_id, cadence, title, period, body)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.id, row.account_id, row.cadence, row.title, row.period, row.body],
    );
  }

  return row;
}

export async function deleteJournalRecap(id: string): Promise<void> {
  if (!isTauri()) {
    for (const rows of Object.values(SEED_JOURNAL)) {
      const index = rows.findIndex((recap) => recap.id === id);
      if (index >= 0) {
        rows.splice(index, 1);
        return;
      }
    }
    return;
  }

  const db = await getDb();
  await db.execute("DELETE FROM journal_recaps WHERE id = $1", [id]);
}

const SEED_JOURNAL: Record<JournalRecapRow["cadence"], JournalRecapRow[]> = {
  daily: [
    {
      id: "d1",
      account_id: "ACC-1",
      cadence: "daily",
      title: "Wednesday recap",
      period: "2026-07-02",
      body: "Two trades, one win (+1.2R) and one scratch. Followed plan on both.",
      created_at: "2026-07-02T20:00:00Z",
    },
    {
      id: "d2",
      account_id: "ACC-1",
      cadence: "daily",
      title: "Tuesday recap",
      period: "2026-07-01",
      body: "Missed entry on EURUSD setup. Waited too long.",
      created_at: "2026-07-01T20:00:00Z",
    },
  ],
  weekly: [],
  monthly: [],
};

export async function addScreenshot(
  tradeId: string,
  stage: ScreenshotRow["stage"],
  path: string,
  caption = "",
): Promise<ScreenshotRow> {
  const row: ScreenshotRow = {
    id: `S-${Date.now().toString().slice(-10)}-${Math.random().toString(36).slice(2, 6)}`,
    trade_id: tradeId,
    stage,
    path,
    caption,
    created_at: new Date().toISOString(),
  };

  if (!isTauri()) {
    const trade = memoryTrades.get(tradeId);
    if (trade) {
      memoryTrades.set(tradeId, {
        ...trade,
        screenshots: [...trade.screenshots, row],
      });
    }
    return row;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO screenshots (id, trade_id, stage, path, caption)
     VALUES ($1, $2, $3, $4, $5)`,
    [row.id, row.trade_id, row.stage, row.path, row.caption],
  );
  return row;
}

export async function deleteScreenshot(
  id: string,
  path: string,
): Promise<void> {
  if (!isTauri()) {
    for (const trade of memoryTrades.values()) {
      trade.screenshots = trade.screenshots.filter(
        (screenshot) => screenshot.id !== id,
      );
    }
    return;
  }

  const db = await getDb();
  await db.execute("DELETE FROM screenshots WHERE id = $1", [id]);
  // Physical file cleanup is intentionally left to storage.ts callers.
  void path;
}
