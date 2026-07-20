-- System accounts follow educator or community trade calls instead of strategies.

CREATE TABLE account_strategies_backup (
  account_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL
);

INSERT INTO account_strategies_backup (account_id, strategy_id)
SELECT account_id, strategy_id FROM account_strategies;

DROP TABLE account_strategies;

CREATE TABLE accounts_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starting_balance REAL NOT NULL,
  commission REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('live', 'demo', 'backtesting', 'system')),
  risk_plan_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (risk_plan_id) REFERENCES risk_management_plans(id) ON DELETE SET NULL
);

INSERT INTO accounts_new (
  id,
  name,
  starting_balance,
  commission,
  currency,
  account_type,
  risk_plan_id,
  created_at,
  updated_at
)
SELECT
  id,
  name,
  starting_balance,
  commission,
  currency,
  account_type,
  risk_plan_id,
  created_at,
  updated_at
FROM accounts;

DROP TABLE accounts;
ALTER TABLE accounts_new RENAME TO accounts;

CREATE INDEX idx_accounts_type ON accounts(account_type);

CREATE TABLE account_strategies (
  account_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  PRIMARY KEY (account_id, strategy_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

INSERT INTO account_strategies (account_id, strategy_id)
SELECT account_id, strategy_id FROM account_strategies_backup;

DROP TABLE account_strategies_backup;

CREATE INDEX idx_account_strategies_strategy ON account_strategies(strategy_id);

CREATE TABLE educators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  community TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE account_educators (
  account_id TEXT NOT NULL,
  educator_id TEXT NOT NULL,
  PRIMARY KEY (account_id, educator_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (educator_id) REFERENCES educators(id) ON DELETE CASCADE
);

CREATE INDEX idx_account_educators_educator ON account_educators(educator_id);
