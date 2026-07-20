export function strategyOptionsWithDraft(values: string[], draft: string) {
  const value = draft.trim();
  if (!value) return values;
  if (values.some((item) => item.toLowerCase() === value.toLowerCase())) {
    return values;
  }
  return [...values, value];
}
