-- Initial schema for Trading Journal

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  trade_date TEXT NOT NULL,
  pair TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  status TEXT NOT NULL CHECK (status IN ('pre-trade', 'open', 'closed', 'reviewed')),

  pre_thesis TEXT NOT NULL DEFAULT '',
  pre_levels TEXT NOT NULL DEFAULT '',
  pre_confluences TEXT NOT NULL DEFAULT '',

  entry_price REAL,
  entry_size REAL,
  entry_time TEXT,

  exit_price REAL,
  exit_time TEXT,
  exit_reason TEXT NOT NULL DEFAULT '',

  pnl REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

CREATE TABLE IF NOT EXISTS recaps (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recaps_trade ON recaps(trade_id);

CREATE TABLE IF NOT EXISTS journal_recaps (
  id TEXT PRIMARY KEY,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_cadence ON journal_recaps(cadence, created_at DESC);