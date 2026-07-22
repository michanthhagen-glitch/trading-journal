import type { TradeTargetUnit } from "../tradeInstruments";
import type {
  AccountTypeValue,
  EducatorSetupInput,
  RiskPlanSetupInput,
  StrategySetupInput,
  StrategyTargetMode,
  TradingAccountSetupInput,
} from "./accountSetupValidation";
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
  key_level: string;
  entry_condition: string;
  exit_condition: string;
  backtest_session_id: string | null;
  backtest_tested_at: string | null;
  backtest_targets: string;
  take_profit_targets: string;
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

export type AccountType = AccountTypeValue;
export type {
  EducatorSetupInput,
  RiskPlanSetupInput,
  StrategySetupInput,
  StrategyTargetMode,
  TradingAccountSetupInput,
};

export type Strategy = {
  id: string;
  name: string;
  strategy: string;
  entryRules: string;
  slTpRules: string;
  invalidationRules: string;
  currencyPairs: string[];
  keyLevels: string[];
  entryConditions: string[];
  exitConditions: string[];
  targetMode: StrategyTargetMode;
  targetUnit: TradeTargetUnit;
  fixedStopLoss: number | null;
  fixedTakeProfits: number[];
  riskRewardGoal: number | null;
  notes: string;
  created_at: string;
};

export type Educator = {
  id: string;
  name: string;
  community: string;
  notes: string;
  strategyIds: string[];
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
  educatorIds: string[];
  riskPlanId: string | null;
  created_at: string;
};

export type StrategyRow = {
  id: string;
  name: string;
  strategy: string;
  entry_rules: string;
  sl_tp_rules: string;
  invalidation_rules: string;
  currency_pairs: string;
  key_levels: string;
  entry_conditions: string;
  exit_conditions: string;
  target_plan_mode: string;
  target_unit: string;
  fixed_stop_loss: number | null;
  fixed_take_profits: string;
  risk_reward_goal: number | null;
  notes: string;
  created_at: string;
};

export type EducatorRow = {
  id: string;
  name: string;
  community: string;
  notes: string;
  strategy_id: string | null;
  created_at: string;
};

export type RiskManagementPlanRow = {
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

export type TradingAccountRow = {
  id: string;
  name: string;
  starting_balance: number;
  commission: number;
  currency: string;
  account_type: AccountType;
  risk_plan_id: string | null;
  created_at: string;
};

export type AccountStrategyRow = {
  account_id: string;
  strategy_id: string;
};

export type AccountEducatorRow = {
  account_id: string;
  educator_id: string;
};

export type EducatorStrategyRow = {
  educator_id: string;
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
  keyLevel: string;
  entryCondition: string;
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
  takeProfits: number[];
  notes: string;
  confidence: number | null;
};

export type ExitData = {
  price: number | null;
  result: TradeResult;
  note: string;
  feeling: number | null;
  time: string | null;
  exitCondition: string;
};

export type BacktestTarget = {
  takeProfit: number | null;
  result: TradeResult;
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
  backtestSessionId: string | null;
  backtestTestedAt: string | null;
  backtestTargets: BacktestTarget[];
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
