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

function escapePattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function timePattern(parts: Intl.DateTimeFormatPart[]): RegExp {
  const pattern = parts
    .map(({ type, value }) => {
      if (type === 'hour') {
        return '(?<hour>[0-9]{1,2})';
      }
      if (type === 'minute') {
        return '(?<minute>[0-9]{2})';
      }
      return escapePattern(withoutDirectionMarks(value)).replace(/\s+/gu, '\\s*');
    })
    .join('');
  return new RegExp(`^${pattern}$`, 'iu');
}

export function createTimeLocale(locale: string | undefined, fallback?: string): TimeLocale {
  const formatter = timeFormatter(locale, fallback);
  const {
    hourCycle = 'h23',
    numberingSystem,
    locale: resolvedLocale,
  } = formatter.resolvedOptions();
  const number = new Intl.NumberFormat(resolvedLocale, { numberingSystem, useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, index) => number.format(index));
  const digitPattern = new RegExp(digits.map(escapePattern).join('|'), 'gu');
  const morning = formatter.formatToParts(0);
  const afternoon = formatter.formatToParts(12 * 60 * 60 * 1000);
  const hasDayPeriod = morning.some(({ type }) => type === 'dayPeriod');
  const patterns = hasDayPeriod
    ? [timePattern(morning), timePattern(afternoon)]
    : [timePattern(morning)];
  const minHour = hourCycle === 'h12' || hourCycle === 'h24' ? 1 : 0;
  const maxHour = hasDayPeriod ? minHour + 11 : minHour + 23;

  return {
    format: (minutes) => formatter.format(minutes * 60 * 1000),
    parse(text) {
      const normalized = withoutDirectionMarks(text)
        .trim()
        .replace(digitPattern, (digit) => String(digits.indexOf(digit)));
      const canonical = parseCanonicalTime(normalized);
      if (canonical !== undefined) {
        return canonical;
      }

      for (const [period, pattern] of patterns.entries()) {
        const parts = pattern.exec(normalized)?.groups;
        if (parts) {
          const hour = Number(parts.hour);
          const minute = Number(parts.minute);
          if (hour >= minHour && hour <= maxHour && minute < 60) {
            return ((hour % (hasDayPeriod ? 12 : 24)) + period * 12) * MINUTES_IN_HOUR + minute;
          }
        }
      }
      return undefined;
    },
  };
}
