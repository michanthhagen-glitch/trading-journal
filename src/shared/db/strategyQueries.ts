export const LIST_ACCOUNT_SETUP_STRATEGIES_SQL = `
  SELECT id, name, strategy, entry_rules, sl_tp_rules, invalidation_rules,
         currency_pairs, key_levels, entry_conditions, exit_conditions, notes, created_at
    FROM strategies
   ORDER BY created_at DESC
`;
