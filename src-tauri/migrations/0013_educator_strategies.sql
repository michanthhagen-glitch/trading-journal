-- Educators can be connected to multiple existing strategies.

CREATE TABLE educator_strategies (
  educator_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  PRIMARY KEY (educator_id, strategy_id),
  FOREIGN KEY (educator_id) REFERENCES educators(id) ON DELETE CASCADE,
  FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO educator_strategies (educator_id, strategy_id)
SELECT id, strategy_id
FROM educators
WHERE strategy_id IS NOT NULL;

CREATE INDEX idx_educator_strategies_strategy ON educator_strategies(strategy_id);
