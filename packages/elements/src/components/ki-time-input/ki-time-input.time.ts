// Typed placeholders for the first failing behavior tests.
interface TimeBounds {
  min: number;
  max: number;
}

interface TimeLocale {
  format(minutes: number): string;
  parse(text: string): number | undefined;
}

export const parseCanonicalTime: (value: string) => number | undefined = () => undefined;
export const formatCanonicalTime: (minutes: number) => string = () => '';
export const timeBounds: (min: string | undefined, max: string | undefined) => TimeBounds = () => ({
  min: 0,
  max: 1439,
});
export const timeSlots: (bounds: TimeBounds, step: number) => number[] = () => [];
export const createTimeLocale: (locale: string | undefined, fallback?: string) => TimeLocale =
  () => ({
    format: formatCanonicalTime,
    parse: parseCanonicalTime,
  });
