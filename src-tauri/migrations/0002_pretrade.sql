-- Pre-trade analysis fields + screenshots table

ALTER TABLE trades ADD COLUMN pre_trend TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN pre_key_levels TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN pre_bias TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN pre_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE trades ADD COLUMN pre_feeling INTEGER;  -- 1..10, set during pre-trade

-- Screenshots live in the file system; this table just tracks paths + metadata.
-- 'stage' is one of: pre-trade, entry, exit, recap — keeps the same table useful
-- for every lifecycle step.
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('pre-trade', 'entry', 'exit', 'recap')),
  path TEXT NOT NULL,            -- relative path under app data dir, e.g. screenshots/2026-07-03/<uuid>.png
  caption TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_screenshots_trade ON screenshots(trade_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_stage ON screenshots(trade_id, stage);
