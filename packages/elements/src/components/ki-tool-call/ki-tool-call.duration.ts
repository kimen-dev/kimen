/** Format an elapsed duration without losing millisecond precision in seconds. */
export function formatToolCallDuration(
  duration: number | undefined,
  locale: string,
): string | undefined {
  if (duration === undefined || !Number.isFinite(duration) || duration < 0) return undefined;

  const seconds = duration >= 1000;
  const options: Intl.NumberFormatOptions = {
    style: 'unit',
    unit: seconds ? 'second' : 'millisecond',
    unitDisplay: 'short',
    maximumFractionDigits: 3,
  };
  const value = seconds ? duration / 1000 : duration;
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat('en', options).format(value);
  }
}
