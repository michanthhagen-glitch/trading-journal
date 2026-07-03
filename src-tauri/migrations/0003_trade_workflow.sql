-- Pre-trade, entry, and exit workflow fields

ALTER TABLE trades ADD COLUMN pre_strategy TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN risk_percent REAL;
ALTER TABLE trades ADD COLUMN risk_amount REAL;

ALTER TABLE trades ADD COLUMN stop_loss REAL;
ALTER TABLE trades ADD COLUMN take_profit REAL;
ALTER TABLE trades ADD COLUMN entry_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN entry_confidence INTEGER;

ALTER TABLE trades ADD COLUMN exit_result TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN exit_feeling INTEGER;
