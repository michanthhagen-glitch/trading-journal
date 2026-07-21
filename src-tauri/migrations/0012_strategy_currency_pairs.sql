-- Currency pairs available to every workflow that uses a strategy.

ALTER TABLE strategies ADD COLUMN currency_pairs TEXT NOT NULL DEFAULT '[]';
