-- Strategy-owned SL/TP behavior and multiple planned take profits.

ALTER TABLE strategies ADD COLUMN target_plan_mode TEXT NOT NULL DEFAULT 'custom'
  CHECK (target_plan_mode IN ('fixed', 'risk-reward', 'custom'));
ALTER TABLE strategies ADD COLUMN target_unit TEXT NOT NULL DEFAULT 'price'
  CHECK (target_unit IN ('price', 'points', 'pips', 'ticks'));
ALTER TABLE strategies ADD COLUMN fixed_stop_loss REAL;
ALTER TABLE strategies ADD COLUMN fixed_take_profits TEXT NOT NULL DEFAULT '[]';
ALTER TABLE strategies ADD COLUMN risk_reward_goal INTEGER;

ALTER TABLE trades ADD COLUMN take_profit_targets TEXT NOT NULL DEFAULT '[]';

UPDATE trades
   SET take_profit_targets = '[' || CAST(take_profit AS TEXT) || ']'
 WHERE take_profit IS NOT NULL;
