-- Structured per-trade recap fields for automation.

ALTER TABLE recaps ADD COLUMN grade TEXT NOT NULL DEFAULT '';
ALTER TABLE recaps ADD COLUMN followed_plan TEXT NOT NULL DEFAULT '';
ALTER TABLE recaps ADD COLUMN setup_quality INTEGER;
ALTER TABLE recaps ADD COLUMN entry_quality INTEGER;
ALTER TABLE recaps ADD COLUMN management_quality INTEGER;
ALTER TABLE recaps ADD COLUMN exit_quality INTEGER;
ALTER TABLE recaps ADD COLUMN mistake_tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE recaps ADD COLUMN positive_tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE recaps ADD COLUMN emotion_tag TEXT NOT NULL DEFAULT '';
ALTER TABLE recaps ADD COLUMN rule_broken INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recaps ADD COLUMN lesson TEXT NOT NULL DEFAULT '';
ALTER TABLE recaps ADD COLUMN next_action TEXT NOT NULL DEFAULT '';
