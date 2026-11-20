/** First count rendered in abbreviated form is one greater than this cap. */
const DEFAULT_COUNTER_MAX = 99;

export function formatCount(
  value: number | undefined,
  max = DEFAULT_COUNTER_MAX,
): string | undefined {
  if (value === undefined || !Number.isFinite(value) || value < 1) return undefined;

  const count = Math.floor(value);
  const cap = Number.isFinite(max) && max >= 1 ? Math.floor(max) : DEFAULT_COUNTER_MAX;
  return count > cap ? `${String(cap)}+` : String(count);
}
