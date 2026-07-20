-- Educators can be connected to one existing strategy.

ALTER TABLE educators ADD COLUMN strategy_id TEXT REFERENCES strategies(id) ON DELETE SET NULL;

CREATE INDEX idx_educators_strategy ON educators(strategy_id);
