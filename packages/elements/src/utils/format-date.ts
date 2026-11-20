const ISO_DATE =
  /^(\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/u;

interface FormatDate {
  iso: string;
  date: Date;
  calendarDate: boolean;
}

/** Parse an ISO calendar date or timestamp without rolling an impossible day forward. */
export function parseFormatDate(value: string | undefined): FormatDate | undefined {
  if (!value) return undefined;
  const day = ISO_DATE.exec(value)?.[1];
  if (!day || day.startsWith('0000')) return undefined;

  const calendar = new Date(day);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) {
    return undefined;
  }
  if (value === day) return { iso: value, date: calendar, calendarDate: true };

  const date = new Date(value);
  if (Number.isFinite(date.getTime())) return { iso: value, date, calendarDate: false };
  return undefined;
}
