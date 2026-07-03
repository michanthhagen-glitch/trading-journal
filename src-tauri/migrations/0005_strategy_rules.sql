-- Strategy rule fields

ALTER TABLE strategies ADD COLUMN strategy TEXT NOT NULL DEFAULT '';
ALTER TABLE strategies ADD COLUMN entry_rules TEXT NOT NULL DEFAULT '';
ALTER TABLE strategies ADD COLUMN sl_tp_rules TEXT NOT NULL DEFAULT '';
ALTER TABLE strategies ADD COLUMN invalidation_rules TEXT NOT NULL DEFAULT '';
