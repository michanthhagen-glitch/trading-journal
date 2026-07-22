use tauri_plugin_sql::{Migration, MigrationKind};

pub(crate) const OFFICIAL_DB_URL: &str = "sqlite:trading-journal.db";
pub(crate) const DEV_DB_URL: &str = "sqlite:trading-journal-dev.db";

pub(crate) fn sql_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_pretrade_and_screenshots",
            sql: include_str!("../migrations/0002_pretrade.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_trade_workflow_fields",
            sql: include_str!("../migrations/0003_trade_workflow.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_account_system",
            sql: include_str!("../migrations/0004_accounts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_strategy_rules",
            sql: include_str!("../migrations/0005_strategy_rules.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_risk_plan_limits",
            sql: include_str!("../migrations/0006_risk_plan_limits.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_account_context",
            sql: include_str!("../migrations/0007_account_context.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_trade_recap_structure",
            sql: include_str!("../migrations/0008_trade_recap_structure.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "add_system_accounts_and_educators",
            sql: include_str!("../migrations/0009_system_accounts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "link_educators_to_strategies",
            sql: include_str!("../migrations/0010_educator_strategy.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "add_backtest_workflow",
            sql: include_str!("../migrations/0011_backtest_workflow.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "add_strategy_currency_pairs",
            sql: include_str!("../migrations/0012_strategy_currency_pairs.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "link_educators_to_multiple_strategies",
            sql: include_str!("../migrations/0013_educator_strategies.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "add_strategy_target_plans",
            sql: include_str!("../migrations/0014_strategy_target_plans.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
