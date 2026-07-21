import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { LIST_ACCOUNT_SETUP_STRATEGIES_SQL } from "../src/shared/db/strategyQueries";

describe("strategy account setup query", () => {
  it("reloads the reusable journaling choices saved on a strategy", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      CREATE TABLE strategies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        strategy TEXT NOT NULL,
        entry_rules TEXT NOT NULL,
        sl_tp_rules TEXT NOT NULL,
        invalidation_rules TEXT NOT NULL,
        currency_pairs TEXT NOT NULL,
        key_levels TEXT NOT NULL,
        entry_conditions TEXT NOT NULL,
        exit_conditions TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO strategies VALUES (
        'STR-1', 'Continuation', '', '', '', '',
        '["EURUSD","GBPJPY"]',
        '["00","50"]', '["Doji"]', '["Target reached"]', '',
        '2026-07-20T20:00:00Z'
      );
    `);

    const row = db.prepare(LIST_ACCOUNT_SETUP_STRATEGIES_SQL).get() as Record<
      string,
      unknown
    >;

    expect(row).toMatchObject({
      currency_pairs: '["EURUSD","GBPJPY"]',
      key_levels: '["00","50"]',
      entry_conditions: '["Doji"]',
      exit_conditions: '["Target reached"]',
    });
    db.close();
  });
});
