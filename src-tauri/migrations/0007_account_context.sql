-- Global account context for trades and journal recaps

ALTER TABLE trades ADD COLUMN account_id TEXT;
ALTER TABLE journal_recaps ADD COLUMN account_id TEXT;

UPDATE trades
   SET account_id = (SELECT id FROM accounts ORDER BY created_at DESC LIMIT 1)
 WHERE account_id IS NULL
   AND EXISTS (SELECT 1 FROM accounts);

UPDATE journal_recaps
   SET account_id = (SELECT id FROM accounts ORDER BY created_at DESC LIMIT 1)
 WHERE account_id IS NULL
   AND EXISTS (SELECT 1 FROM accounts);

CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_recaps_account ON journal_recaps(account_id);
