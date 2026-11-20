const MINUTES_IN_HOUR = 60;
const LAST_MINUTE = 23 * MINUTES_IN_HOUR + 59;

interface TimeBounds {
  min: number;
  max: number;
}

interface TimeLocale {
  format(minutes: number): string;
  parse(text: string): number | undefined;
}

export function parseCanonicalTime(value: string): number | undefined {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/u.exec(value);
  return match ? Number(match[1]) * MINUTES_IN_HOUR + Number(match[2]) : undefined;
}

export function formatCanonicalTime(minutes: number): string {
  const hour = String(Math.floor(minutes / MINUTES_IN_HOUR)).padStart(2, '0');
  const minute = String(minutes % MINUTES_IN_HOUR).padStart(2, '0');
  return `${hour}:${minute}`;
}

export function timeBounds(min: string | undefined, max: string | undefined): TimeBounds {
  return {
    min: parseCanonicalTime(min ?? '') ?? 0,
    max: parseCanonicalTime(max ?? '') ?? LAST_MINUTE,
  };
}

export function timeSlots({ min, max }: TimeBounds, step: number): number[] {
  const interval = Number.isInteger(step) && step > 0 ? step : 30;
  const slots: number[] = [];
  for (let time = min; time <= max; time += interval) {
    slots.push(time);
  }
  return slots;
}

function timeFormatter(
  locale: string | undefined,
  fallback: string | undefined,
): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  };
  try {
    const locales = locale ? [locale, ...(fallback ? [fallback] : [])] : fallback;
    return new Intl.DateTimeFormat(locales, options);
  } catch {
    return new Intl.DateTimeFormat(fallback, options);
  }
}

function withoutDirectionMarks(text: string): string {
  return text.replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, '');
}

function normalizeLiteral(text: string): string {
  return withoutDirectionMarks(text).replace(/\s+/gu, '').toLowerCase();
}

function timeLiterals(parts: Intl.DateTimeFormatPart[]): string[] {
  return parts
    .map(({ type, value }) => (type === 'hour' || type === 'minute' ? '\0' : value))
    .join('')
    .split('\0')
    .map(normalizeLiteral);
}

export function createTimeLocale(locale: string | undefined, fallback?: string): TimeLocale {
  const formatter = timeFormatter(locale, fallback);
  const {
    hourCycle = 'h23',
    numberingSystem,
    locale: resolvedLocale,
  } = formatter.resolvedOptions();
  const number = new Intl.NumberFormat(resolvedLocale, { numberingSystem, useGrouping: false });
  const digits = new Map(
    Array.from({ length: 10 }, (_, index) => [number.format(index), String(index)]),
  );
  const morning = formatter.formatToParts(0);
  const hasDayPeriod = morning.some(({ type }) => type === 'dayPeriod');
  const hourFirst =
    morning.find(({ type }) => type === 'hour' || type === 'minute')?.type === 'hour';
  const patterns = [timeLiterals(morning)];
  if (hasDayPeriod) {
    patterns.push(timeLiterals(formatter.formatToParts(12 * 60 * 60 * 1000)));
  }
  const minHour = hourCycle === 'h12' || hourCycle === 'h24' ? 1 : 0;
  const maxHour = hasDayPeriod ? minHour + 11 : minHour + 23;

  return {
    format: (minutes) => formatter.format(minutes * 60 * 1000),
    parse(text) {
      const normalized = withoutDirectionMarks(text)
        .trim()
        .replace(/./gu, (character) => digits.get(character) ?? character);
      const canonical = parseCanonicalTime(normalized);
      if (canonical !== undefined) {
        return canonical;
      }

      const parts = normalized.split(/([0-9]+)/u);
      const [before = '', first = '', between = '', second = '', after = ''] = parts;
      const [hourText, minuteText] = hourFirst ? [first, second] : [second, first];
      if (parts.length !== 5 || hourText.length > 2 || minuteText.length !== 2) {
        return undefined;
      }
      const [prefix, separator, suffix] = [before, between, after].map(normalizeLiteral);
      const period = patterns.findIndex(
        ([start, split, end]) => start === prefix && split === separator && end === suffix,
      );
      const hour = Number(hourText);
      const minute = Number(minuteText);
      if (period === -1 || hour < minHour || hour > maxHour || minute >= 60) {
        return undefined;
      }
      return ((hour % (hasDayPeriod ? 12 : 24)) + period * 12) * MINUTES_IN_HOUR + minute;
    },
  };
}
