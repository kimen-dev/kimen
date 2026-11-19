const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const UNITS = [
  ['year', 365 * DAY],
  ['month', 30 * DAY],
  ['week', 7 * DAY],
  ['day', DAY],
  ['hour', HOUR],
  ['minute', MINUTE],
] as const;

interface RelativeTime {
  value?: number;
  unit?: Intl.RelativeTimeFormatUnit;
  nextDelay?: number;
}

/** Describe the current wording and when elapsed time could change it. */
export function describeRelativeTime(delta: number, threshold?: number): RelativeTime {
  const distance = Math.abs(delta);
  const cutoff =
    threshold !== undefined && Number.isFinite(threshold) && threshold >= 0
      ? threshold * SECOND
      : Infinity;

  if (distance >= cutoff) {
    // Future absolute dates can enter the relative window. Past ones stay absolute.
    return delta > 0 && cutoff > 0 ? { nextDelay: Math.floor(delta - cutoff) + 1 } : {};
  }

  const index = UNITS.findIndex(([, size]) => distance >= size);
  const [unit, size] = UNITS[index] ?? ['second', SECOND];
  const value = Math.trunc(delta / size) || 0;

  if (delta > 0) {
    const nextDelay =
      value === 0 ? Math.ceil(delta + Math.min(SECOND, cutoff)) : (distance % size) + 1;
    return { value, unit, nextDelay };
  }

  // Rounding, changing units, and reaching the cutoff can happen independently.
  const nextUnit = UNITS[index === -1 ? UNITS.length - 1 : index - 1]?.[1] ?? Infinity;
  const nextDelay = Math.ceil(
    Math.min(size - (distance % size), nextUnit - distance, cutoff - distance),
  );
  return { value, unit, nextDelay };
}
