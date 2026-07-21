export const LIST_ACCOUNT_SETUP_STRATEGIES_SQL = `
  SELECT id, name, strategy, entry_rules, sl_tp_rules, invalidation_rules,
         currency_pairs, key_levels, entry_conditions, exit_conditions,
         target_plan_mode, target_unit, fixed_stop_loss, fixed_take_profits,
         risk_reward_goal, notes, created_at
    FROM strategies
   ORDER BY created_at DESC
`;
