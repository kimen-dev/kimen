export type TimelineOrder = 'newest-first' | 'oldest-first';

const ISO_DATE =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)?)?$/u;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function parseTimelineDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = ISO_DATE.exec(value);
  if (!match) return undefined;

  // Date.parse alone accepts impossible calendar dates in some engines.
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (year === 0 || calendarDate.getUTCDate() !== day) return undefined;

  // A date without a time represents the local calendar day.
  const timestamp = Date.parse(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function formatTimelineDate(
  value: string,
  timestamp: number,
  now: number,
  locale?: string,
): string {
  const age = now - timestamp;
  const dateOnly = value.length === 10;
  if (!dateOnly && age >= 0 && age < DAY) {
    const formatter = new Intl.RelativeTimeFormat(locale);
    return age < HOUR
      ? formatter.format(-Math.floor(age / MINUTE), 'minute')
      : formatter.format(-Math.floor(age / HOUR), 'hour');
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: dateOnly ? undefined : 'short',
  }).format(timestamp);
}

export function nextTimelineRefresh(
  value: string,
  timestamp: number,
  now: number,
): number | undefined {
  if (value.length === 10) return undefined;

  const age = now - timestamp;
  if (age >= DAY) return undefined;
  if (age < 0) return Math.min(-age, 2_147_483_647);

  const unit = age < HOUR ? MINUTE : HOUR;
  return unit - (age % unit);
}

export function orderTimelineItems<T extends { timestamp: number | undefined }>(
  items: readonly T[],
  order: TimelineOrder,
): T[] {
  return [...items].sort((first, second) => {
    if (first.timestamp === undefined) return second.timestamp === undefined ? 0 : 1;
    if (second.timestamp === undefined) return -1;
    return order === 'oldest-first'
      ? first.timestamp - second.timestamp
      : second.timestamp - first.timestamp;
  });
}
