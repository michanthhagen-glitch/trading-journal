-- Risk plan limits and goals

ALTER TABLE risk_management_plans ADD COLUMN risk_per_trade_min_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN risk_per_trade_max_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN risk_per_day_min_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN risk_per_day_mid_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN risk_per_day_max_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN risk_per_week_min_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN risk_per_week_max_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN max_trades_per_day INTEGER;
ALTER TABLE risk_management_plans ADD COLUMN max_losing_trades_per_day INTEGER;
ALTER TABLE risk_management_plans ADD COLUMN max_losing_days_in_row INTEGER;
ALTER TABLE risk_management_plans ADD COLUMN daily_goal_min_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN daily_goal_max_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN weekly_goal_min_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN weekly_goal_mid_percent REAL;
ALTER TABLE risk_management_plans ADD COLUMN weekly_goal_max_percent REAL;

UPDATE risk_management_plans
   SET risk_per_trade_max_percent = COALESCE(risk_per_trade_max_percent, risk_percent),
       risk_per_day_max_percent = COALESCE(risk_per_day_max_percent, max_daily_loss_percent);
