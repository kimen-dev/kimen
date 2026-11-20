export type DatePickerMode = 'single' | 'range';

const minDate = '0001-01-01';
const maxDate = '9999-12-31';
const isoPattern = /^\d{4}-\d{2}-\d{2}$/u;

export function fromIso(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function toIso(date: Date): string | undefined {
  return date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999
    ? date.toISOString().slice(0, 10)
    : undefined;
}

export function isoDate(value: string | undefined): string | undefined {
  if (!value || !isoPattern.test(value)) return undefined;
  return toIso(fromIso(value)) === value ? value : undefined;
}

export function todayDate(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function clampDate(value: string, min = minDate, max = maxDate): string {
  return value < min ? min : value > max ? max : value;
}

export function inBounds(date: string, min = minDate, max = maxDate): boolean {
  return date >= min && date <= max;
}

export function rangeValue(start: string, end: string): string {
  return start <= end ? `${start}/${end}` : `${end}/${start}`;
}

export function normalizeValue(
  value: string | null,
  mode: DatePickerMode,
  min?: string,
  max?: string,
): string | undefined {
  if (!value) return '';
  const dates = value.split('/');
  if (dates.length !== (mode === 'range' ? 2 : 1)) return undefined;
  const start = isoDate(dates[0]);
  const end = isoDate(dates[1] ?? start);
  if (!start || !end || !inBounds(start, min, max) || !inBounds(end, min, max)) return undefined;
  return mode === 'range' ? rangeValue(start, end) : start;
}

export function calendarLocale(locale?: string, pageLanguage?: string): string {
  for (const candidate of [locale, pageLanguage]) {
    if (!candidate) continue;
    try {
      const [supported] = Intl.DateTimeFormat.supportedLocalesOf(candidate);
      if (supported) return supported;
    } catch {
      // An invalid language tag falls back to the page or runtime language.
    }
  }
  return new Intl.DateTimeFormat().resolvedOptions().locale;
}

const dateOptions = { calendar: 'gregory', timeZone: 'UTC' } as const;
const sample = fromIso('2006-11-23');
const rangeSeparator = ' – ';
const bidiMarks = /[\u061c\u200e\u200f\u2066-\u2069]/gu;

type CalendarFormats = Record<
  'month' | 'day' | 'full' | 'short' | 'weekday' | 'weekdayShort',
  Intl.DateTimeFormat
>;

export function calendarFormats(locale: string): CalendarFormats {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...dateOptions, ...options });
  return {
    month: format({ month: 'long', year: 'numeric' }),
    day: format({ day: 'numeric' }),
    full: format({ dateStyle: 'long' }),
    short: format({ dateStyle: 'medium' }),
    weekday: format({ weekday: 'long' }),
    weekdayShort: format({ weekday: 'short' }),
  };
}

function entryFormat(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    ...dateOptions,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatValue(
  value: string,
  locale: string,
  formatter = entryFormat(locale),
): string {
  if (!value) return '';
  const year = new Intl.NumberFormat(locale, { useGrouping: false, minimumIntegerDigits: 4 });
  return value
    .split('/')
    .map((iso) =>
      formatter
        .formatToParts(fromIso(iso))
        .map(({ type, value }) => {
          if (type !== 'year') return value;
          return year.format(Number(iso.slice(0, 4)));
        })
        .join(''),
    )
    .join(rangeSeparator);
}

export function parseEntry(
  entry: string,
  mode: DatePickerMode,
  locale: string,
  min?: string,
  max?: string,
): string | undefined {
  const text = entry.trim().replace(bidiMarks, '');
  const iso = normalizeValue(text, mode, min, max);
  if (iso !== undefined) return iso;

  const parts = entryFormat(locale).formatToParts(sample);
  const digits = new Intl.NumberFormat(locale, { useGrouping: false });
  let latin = text;
  for (let digit = 0; digit < 10; digit++) {
    latin = latin.replaceAll(digits.format(digit), String(digit));
  }
  const entries = mode === 'range' ? latin.split(/\s*–\s*|\s+-\s+/u) : [latin];
  const dates: string[] = [];
  for (const part of entries) {
    const tokens = part.trim().match(/\d+|\D+/gu);
    if (tokens?.length !== parts.length) return undefined;
    const date: Record<string, string> = {};
    for (const { type, value } of parts) {
      const token = tokens.shift() ?? '';
      if (type === 'literal') {
        if (token.trim() !== value.replace(bidiMarks, '').trim()) return undefined;
      } else {
        date[type] = token.padStart(2, '0');
      }
    }
    dates.push([date.year, date.month, date.day].join('-'));
  }
  return normalizeValue(dates.join('/'), mode, min, max);
}

// Fallback for engines that have yet to expose Intl.Locale week data.
const saturdayRegions = 'AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' ');
const sundayRegions =
  'AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN IS JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(
    ' ',
  );

export function firstWeekday(locale: string, override?: number): number {
  if (override !== undefined && Number.isInteger(override) && override >= 0 && override <= 6) {
    return override;
  }
  interface WeekInfo {
    firstDay: number;
  }
  const language: Intl.Locale & {
    getWeekInfo?: () => WeekInfo;
    weekInfo?: WeekInfo;
  } = new Intl.Locale(locale);
  const first = (language.getWeekInfo?.() ?? language.weekInfo)?.firstDay;
  if (first !== undefined) return first % 7;
  const region = language.maximize().region ?? '';
  if (sundayRegions.includes(region)) return 0;
  if (saturdayRegions.includes(region)) return 6;
  return region === 'MV' ? 5 : 1;
}

export function weekdayDates(first: number): Date[] {
  return Array.from({ length: 7 }, (_, index) => new Date(Date.UTC(2026, 10, 1 + first + index)));
}

export function daysForMonth(value: string, first: number): (string | undefined)[][] {
  const start = fromIso(`${value.slice(0, 7)}-01`);
  const leading = (start.getUTCDay() - first + 7) % 7;
  start.setUTCDate(1 - leading);
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 7 }, () => {
      const date = toIso(start);
      start.setUTCDate(start.getUTCDate() + 1);
      return date;
    }),
  );
}

export function addMonths(value: string, amount: number): string {
  const date = fromIso(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount + 1, 0);
  date.setUTCDate(Math.min(day, date.getUTCDate()));
  return toIso(date) ?? (amount < 0 ? minDate : maxDate);
}

export function moveDate(
  value: string,
  key: string,
  first: number,
  year: boolean,
  rtl: boolean,
  min?: string,
  max?: string,
): string | undefined {
  if (key === 'PageUp' || key === 'PageDown') {
    const amount = (key === 'PageUp' ? -1 : 1) * (year ? 12 : 1);
    return clampDate(addMonths(value, amount), min, max);
  }
  const date = fromIso(value);
  const offset = (date.getUTCDay() - first + 7) % 7;
  const shifts: Record<string, number> = {
    ArrowLeft: rtl ? 1 : -1,
    ArrowRight: rtl ? -1 : 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -offset,
    End: 6 - offset,
  };
  const shift = shifts[key];
  if (shift === undefined) return undefined;
  date.setUTCDate(date.getUTCDate() + shift);
  return clampDate(toIso(date) ?? (shift < 0 ? minDate : maxDate), min, max);
}
