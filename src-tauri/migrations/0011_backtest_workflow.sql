-- Reusable strategy selectors and Backtesting trade context.

ALTER TABLE strategies ADD COLUMN key_levels TEXT NOT NULL DEFAULT '[]';
ALTER TABLE strategies ADD COLUMN entry_conditions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE strategies ADD COLUMN exit_conditions TEXT NOT NULL DEFAULT '[]';

ALTER TABLE trades ADD COLUMN key_level TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN entry_condition TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN exit_condition TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN backtest_session_id TEXT;
ALTER TABLE trades ADD COLUMN backtest_tested_at TEXT;
ALTER TABLE trades ADD COLUMN backtest_targets TEXT NOT NULL DEFAULT '[]';

CREATE INDEX idx_trades_backtest_session ON trades(backtest_session_id);
