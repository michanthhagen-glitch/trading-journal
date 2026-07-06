// Database layer for the Trading Journal.
// In Tauri we connect to SQLite. In browser mode we use in-memory data so
// layout work stays fast without opening the desktop shell.

import Database from "@tauri-apps/plugin-sql";

const DB_URL =
  import.meta.env.VITE_TRADING_JOURNAL_DB_URL ?? "sqlite:trading-journal.db";

export type TradeStatus = "pre-trade" | "open" | "closed" | "reviewed";
export type TradeResult = "" | "win" | "loss" | "break-even";
export type TradeRecapGrade = "" | "A" | "B" | "C" | "D";
export type TradeRecapPlanFollowed = "" | "yes" | "partial" | "no";

export type TradeRow = {
  id: string;
  account_id: string | null;
  trade_date: string;
  pair: string;
  direction: "long" | "short";
  status: TradeStatus;
  pre_thesis: string;
  pre_levels: string;
  pre_confluences: string;
  pre_trend: string;
  pre_key_levels: string;
  pre_bias: string;
  pre_notes: string;
  pre_feeling: number | null;
  pre_strategy: string;
  risk_percent: number | null;
  risk_amount: number | null;
  entry_price: number | null;
  entry_size: number | null;
  entry_time: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  entry_notes: string;
  entry_confidence: number | null;
  exit_price: number | null;
  exit_time: string | null;
  exit_reason: string;
  exit_result: string;
  exit_feeling: number | null;
  pnl: number | null;
  created_at: string;
  updated_at: string;
};

export type RecapRow = {
  id: string;
  trade_id: string;
  body: string;
  grade: TradeRecapGrade;
  followed_plan: TradeRecapPlanFollowed;
  setup_quality: number | null;
  entry_quality: number | null;
  management_quality: number | null;
  exit_quality: number | null;
  mistake_tags: string;
  positive_tags: string;
  emotion_tag: string;
  rule_broken: number;
  lesson: string;
  next_action: string;
  created_at: string;
};

export type TradeRecapInput = {
  grade: TradeRecapGrade;
  followedPlan: TradeRecapPlanFollowed;
  setupQuality: number | null;
  entryQuality: number | null;
  managementQuality: number | null;
  exitQuality: number | null;
  mistakeTags: string[];
  positiveTags: string[];
  emotionTag: string;
  ruleBroken: boolean;
  lesson: string;
  nextAction: string;
  body: string;
};

export type TradeRecap = TradeRecapInput & {
  id: string;
  tradeId: string;
  createdAt: string;
};

export type JournalRecapRow = {
  id: string;
  account_id: string | null;
  cadence: "daily" | "weekly" | "monthly";
  title: string;
  period: string;
  body: string;
  created_at: string;
};

export type JournalRecapInput = {
  id?: string;
  accountId?: string | null;
  cadence: JournalRecapRow["cadence"];
  title: string;
  period: string;
  body: string;
};

export type AccountType = "live" | "demo" | "backtesting";

export type Strategy = {
  id: string;
  name: string;
  strategy: string;
  entryRules: string;
  slTpRules: string;
  invalidationRules: string;
  notes: string;
  created_at: string;
};

export type RiskManagementPlan = {
  id: string;
  name: string;
  riskPercent: number | null;
  maxDailyLossPercent: number | null;
  riskPerTradeMinPercent: number | null;
  riskPerTradeMaxPercent: number | null;
  riskPerDayMinPercent: number | null;
  riskPerDayMidPercent: number | null;
  riskPerDayMaxPercent: number | null;
  riskPerWeekMinPercent: number | null;
  riskPerWeekMaxPercent: number | null;
  maxTradesPerDay: number | null;
  maxLosingTradesPerDay: number | null;
  maxLosingDaysInRow: number | null;
  dailyGoalMinPercent: number | null;
  dailyGoalMaxPercent: number | null;
  weeklyGoalMinPercent: number | null;
  weeklyGoalMidPercent: number | null;
  weeklyGoalMaxPercent: number | null;
  notes: string;
  created_at: string;
};

export type TradingAccount = {
  id: string;
  name: string;
  startingBalance: number;
  commission: number;
  currency: string;
  accountType: AccountType;
  strategyIds: string[];
  riskPlanId: string | null;
  created_at: string;
};

type StrategyRow = {
  id: string;
  name: string;
  strategy: string;
  entry_rules: string;
  sl_tp_rules: string;
  invalidation_rules: string;
  notes: string;
  created_at: string;
};

type RiskManagementPlanRow = {
  id: string;
  name: string;
  risk_percent: number | null;
  max_daily_loss_percent: number | null;
  risk_per_trade_min_percent: number | null;
  risk_per_trade_max_percent: number | null;
  risk_per_day_min_percent: number | null;
  risk_per_day_mid_percent: number | null;
  risk_per_day_max_percent: number | null;
  risk_per_week_min_percent: number | null;
  risk_per_week_max_percent: number | null;
  max_trades_per_day: number | null;
  max_losing_trades_per_day: number | null;
  max_losing_days_in_row: number | null;
  daily_goal_min_percent: number | null;
  daily_goal_max_percent: number | null;
  weekly_goal_min_percent: number | null;
  weekly_goal_mid_percent: number | null;
  weekly_goal_max_percent: number | null;
  notes: string;
  created_at: string;
};

type TradingAccountRow = {
  id: string;
  name: string;
  starting_balance: number;
  commission: number;
  currency: string;
  account_type: AccountType;
  risk_plan_id: string | null;
  created_at: string;
};

type AccountStrategyRow = {
  account_id: string;
  strategy_id: string;
};

export type ScreenshotRow = {
  id: string;
  trade_id: string;
  stage: "pre-trade" | "entry" | "exit" | "recap";
  path: string;
  caption: string;
  created_at: string;
};

export type PreTradeData = {
  strategy: string;
  riskPercent: number | null;
  riskAmount: number | null;
  bias: string;
  notes: string;
  feeling: number | null;
};

export type EntryData = {
  time: string | null;
  price: number | null;
  lotSize: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  notes: string;
  confidence: number | null;
};

export type ExitData = {
  price: number | null;
  result: TradeResult;
  note: string;
  feeling: number | null;
  time: string | null;
};

export type Trade = {
  id: string;
  accountId: string | null;
  date: string;
  pair: string;
  direction: "long" | "short";
  status: TradeStatus;
  preTrade: PreTradeData;
  entry: EntryData;
  exit: ExitData;
  pnl: number | null;
  hasRecap: boolean;
  recap: TradeRecap | null;
  screenshots: ScreenshotRow[];
};

export type NewTrade = Omit<
  Trade,
  "id" | "status" | "hasRecap" | "recap" | "screenshots" | "accountId"
> & {
  accountId?: string | null;
  status?: TradeStatus;
};

function normalizedResult(value: string): TradeResult {
  if (value === "win" || value === "loss" || value === "break-even") {
    return value;
  }
  return "";
}

function normalizedRecapGrade(value: string): TradeRecapGrade {
  if (value === "A" || value === "B" || value === "C" || value === "D") {
    return value;
  }
  return "";
}

function normalizedPlanFollowed(value: string): TradeRecapPlanFollowed {
  if (value === "yes" || value === "partial" || value === "no") return value;
  return "";
}

function stringArrayFromJson(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Older local rows can contain plain text; keep them from breaking reads.
  }
  return [];
}

function recapRowToRecap(row: RecapRow): TradeRecap {
  return {
    id: row.id,
    tradeId: row.trade_id,
    grade: normalizedRecapGrade(row.grade),
    followedPlan: normalizedPlanFollowed(row.followed_plan),
    setupQuality: row.setup_quality,
    entryQuality: row.entry_quality,
    managementQuality: row.management_quality,
    exitQuality: row.exit_quality,
    mistakeTags: stringArrayFromJson(row.mistake_tags),
    positiveTags: stringArrayFromJson(row.positive_tags),
    emotionTag: row.emotion_tag ?? "",
    ruleBroken: row.rule_broken === 1,
    lesson: row.lesson ?? "",
    nextAction: row.next_action ?? "",
    body: row.body ?? "",
    createdAt: row.created_at,
  };
}

function rowToTrade(
  row: TradeRow,
  recap: TradeRecap | null,
  screenshots: ScreenshotRow[],
): Trade {
  return {
    id: row.id,
    accountId: row.account_id,
    date: row.trade_date,
    pair: row.pair,
    direction: row.direction,
    status: row.status,
    preTrade: {
      strategy: row.pre_strategy ?? "",
      riskPercent: row.risk_percent,
      riskAmount: row.risk_amount,
      bias: row.pre_bias ?? "",
      notes: row.pre_notes ?? "",
      feeling: row.pre_feeling,
    },
    entry: {
      time: row.entry_time,
      price: row.entry_price,
      lotSize: row.entry_size,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      notes: row.entry_notes ?? "",
      confidence: row.entry_confidence,
    },
    exit: {
      price: row.exit_price,
      result: normalizedResult(row.exit_result ?? ""),
      note: row.exit_reason ?? "",
      feeling: row.exit_feeling,
      time: row.exit_time,
    },
    pnl: row.pnl,
    hasRecap: recap !== null,
    recap,
    screenshots,
  };
}

function hasEntryData(entry: EntryData): boolean {
  return Boolean(
    entry.time ||
    entry.notes.trim() ||
    entry.price !== null ||
    entry.lotSize !== null ||
    entry.stopLoss !== null ||
    entry.takeProfit !== null ||
    entry.confidence !== null,
  );
}

function hasExitData(exit: ExitData, pnl: number | null): boolean {
  return Boolean(
    exit.note.trim() ||
    exit.time ||
    exit.result ||
    exit.price !== null ||
    exit.feeling !== null ||
    pnl !== null,
  );
}

function deriveStatus(input: NewTrade): TradeStatus {
  if (input.status) return input.status;
  if (hasExitData(input.exit, input.pnl)) return "closed";
  if (hasEntryData(input.entry)) return "open";
  return "pre-trade";
}

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
      notes: "Clean retest with strong candle close.",
      confidence: 8,
    },
    exit: {
      price: 1.0872,
      result: "win",
      note: "Target hit. Followed plan.",
      feeling: 7,
      time: null,
    },
    pnl: 240,
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
      notes: "Entered after 5m lower high.",
      confidence: 6,
    },
    exit: { price: null, result: "", note: "", feeling: null, time: null },
    pnl: null,
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
      notes: "FOMO entry into resistance.",
      confidence: 4,
    },
    exit: {
      price: 19762,
      result: "loss",
      note: "Stopped out. Entry was too early.",
      feeling: 3,
      time: null,
    },
    pnl: -150,
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

export async function initializeDatabase(): Promise<void> {
  if (!isTauri()) return;
  await getDb();
}

function rowToRiskPlan(row: RiskManagementPlanRow): RiskManagementPlan {
  return {
    id: row.id,
    name: row.name,
    riskPercent: row.risk_percent,
    maxDailyLossPercent: row.max_daily_loss_percent,
    riskPerTradeMinPercent: row.risk_per_trade_min_percent,
    riskPerTradeMaxPercent: row.risk_per_trade_max_percent ?? row.risk_percent,
    riskPerDayMinPercent: row.risk_per_day_min_percent,
    riskPerDayMidPercent: row.risk_per_day_mid_percent,
    riskPerDayMaxPercent:
      row.risk_per_day_max_percent ?? row.max_daily_loss_percent,
    riskPerWeekMinPercent: row.risk_per_week_min_percent,
    riskPerWeekMaxPercent: row.risk_per_week_max_percent,
    maxTradesPerDay: row.max_trades_per_day,
    maxLosingTradesPerDay: row.max_losing_trades_per_day,
    maxLosingDaysInRow: row.max_losing_days_in_row,
    dailyGoalMinPercent: row.daily_goal_min_percent,
    dailyGoalMaxPercent: row.daily_goal_max_percent,
    weeklyGoalMinPercent: row.weekly_goal_min_percent,
    weeklyGoalMidPercent: row.weekly_goal_mid_percent,
    weeklyGoalMaxPercent: row.weekly_goal_max_percent,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function rowToStrategy(row: StrategyRow): Strategy {
  return {
    id: row.id,
    name: row.name,
    strategy: row.strategy,
    entryRules: row.entry_rules,
    slTpRules: row.sl_tp_rules,
    invalidationRules: row.invalidation_rules,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function rowToAccount(
  row: TradingAccountRow,
  strategyIds: string[],
): TradingAccount {
  return {
    id: row.id,
    name: row.name,
    startingBalance: row.starting_balance,
    commission: row.commission,
    currency: row.currency,
    accountType: row.account_type,
    strategyIds,
    riskPlanId: row.risk_plan_id,
    created_at: row.created_at,
  };
}

export async function listAccountSetup(): Promise<{
  accounts: TradingAccount[];
  strategies: Strategy[];
  riskPlans: RiskManagementPlan[];
}> {
  if (!isTauri()) {
    return {
      accounts: Array.from(memoryAccounts.values()),
      strategies: Array.from(memoryStrategies.values()),
      riskPlans: Array.from(memoryRiskPlans.values()),
    };
  }

  const db = await getDb();
  const strategyRows = (await db.select(
    `SELECT id, name, strategy, entry_rules, sl_tp_rules, invalidation_rules, notes, created_at
       FROM strategies
      ORDER BY created_at DESC`,
  )) as StrategyRow[];
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

  const strategiesByAccount = new Map<string, string[]>();
  for (const link of links) {
    const ids = strategiesByAccount.get(link.account_id) ?? [];
    ids.push(link.strategy_id);
    strategiesByAccount.set(link.account_id, ids);
  }

  return {
    accounts: accountRows.map((row) =>
      rowToAccount(row, strategiesByAccount.get(row.id) ?? []),
    ),
    strategies: strategyRows.map(rowToStrategy),
    riskPlans: riskRows.map(rowToRiskPlan),
  };
}

export async function createStrategy(input: {
  name: string;
  strategy: string;
  entryRules: string;
  slTpRules: string;
  invalidationRules: string;
}): Promise<Strategy> {
  const name = input.name.trim();
  if (!name) throw new Error("Strategy name is required.");

  const row: Strategy = {
    id: newEntityId("STR"),
    name,
    strategy: input.strategy.trim(),
    entryRules: input.entryRules.trim(),
    slTpRules: input.slTpRules.trim(),
    invalidationRules: input.invalidationRules.trim(),
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
       (id, name, strategy, entry_rules, sl_tp_rules, invalidation_rules, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      row.id,
      row.name,
      row.strategy,
      row.entryRules,
      row.slTpRules,
      row.invalidationRules,
      row.notes,
    ],
  );
  return row;
}

export async function createRiskManagementPlan(input: {
  name: string;
  riskPerTradeMinPercent: number | null;
  riskPerTradeMaxPercent: number | null;
  riskPerDayMinPercent: number | null;
  riskPerDayMidPercent: number | null;
  riskPerDayMaxPercent: number | null;
  riskPerWeekMinPercent: number | null;
  riskPerWeekMaxPercent: number | null;
  maxTradesPerDay: number | null;
  maxLosingTradesPerDay: number | null;
  maxLosingDaysInRow: number | null;
  dailyGoalMinPercent: number | null;
  dailyGoalMaxPercent: number | null;
  weeklyGoalMinPercent: number | null;
  weeklyGoalMidPercent: number | null;
  weeklyGoalMaxPercent: number | null;
  notes: string;
}): Promise<RiskManagementPlan> {
  const name = input.name.trim();
  if (!name) throw new Error("Risk plan name is required.");

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

export async function createTradingAccount(input: {
  name: string;
  startingBalance: number;
  commission: number;
  currency: string;
  accountType: AccountType;
  strategyIds: string[];
  riskPlanId: string | null;
}): Promise<TradingAccount> {
  const name = input.name.trim();
  const strategyIds = Array.from(new Set(input.strategyIds.filter(Boolean)));
  const riskPlanId =
    input.accountType === "backtesting" ? null : input.riskPlanId || null;

  if (!name) throw new Error("Account name is required.");
  if (!Number.isFinite(input.startingBalance) || input.startingBalance < 0) {
    throw new Error("Starting balance must be 0 or higher.");
  }
  if (!Number.isFinite(input.commission) || input.commission < 0) {
    throw new Error("Commission must be 0 or higher.");
  }
  if (strategyIds.length === 0) {
    throw new Error("Select at least one strategy.");
  }
  if (input.accountType === "live" && !riskPlanId) {
    throw new Error("Live accounts need one risk management plan.");
  }

  const row: TradingAccount = {
    id: newEntityId("ACC"),
    name,
    startingBalance: input.startingBalance,
    commission: input.commission,
    currency: input.currency.trim().toUpperCase(),
    accountType: input.accountType,
    strategyIds,
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

  return row;
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
      pnl
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,
      $10,$11,$12,$13,$14,
      $15,$16,$17,
      $18,$19,$20,$21,$22,
      $23,$24,
      $25,$26,$27,$28,$29,
      $30
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
       updated_at = datetime('now')
     WHERE id = $7`,
    [
      data.bias,
      data.notes,
      data.feeling,
      data.strategy,
      data.riskPercent,
      data.riskAmount,
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
       entry_notes = $7,
       entry_confidence = $8,
       status = CASE WHEN status = 'pre-trade' THEN 'open' ELSE status END,
       updated_at = datetime('now')
     WHERE id = $9`,
    [
      direction,
      entry.time,
      entry.price,
      entry.lotSize,
      entry.stopLoss,
      entry.takeProfit,
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
           status = 'closed',
           updated_at = datetime('now')
     WHERE id = $7`,
    [exit.price, exit.time, exit.note, exit.result, exit.feeling, pnl, id],
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
