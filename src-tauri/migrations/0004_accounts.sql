-- Accounts, strategies, and risk management plans

CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_management_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  risk_percent REAL,
  max_daily_loss_percent REAL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starting_balance REAL NOT NULL,
  commission REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('live', 'demo', 'backtesting')),
  risk_plan_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (risk_plan_id) REFERENCES risk_management_plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS account_strategies (
  account_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  PRIMARY KEY (account_id, strategy_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_account_strategies_strategy ON account_strategies(strategy_id);
