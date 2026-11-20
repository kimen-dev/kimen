export interface SliderScale {
  min: number;
  max: number;
  step: number;
}

export type SliderSelection = readonly [number, number];

export function normalizeScale(min: number, max: number, step: number): SliderScale {
  const lower = Number.isFinite(min) ? min : 0;
  return {
    min: lower,
    max: Math.max(lower, Number.isFinite(max) ? max : 100),
    step: Number.isFinite(step) && step > 0 ? step : 1,
  };
}

function decimalPlaces(value: number): number {
  const [coefficient = '', exponent = '0'] = value.toString().split('e');
  return (coefficient.split('.')[1]?.length ?? 0) - Number(exponent);
}

export function snapValue(value: number, { min, max, step }: SliderScale): number {
  if (!Number.isFinite(value) || value <= min) return min;
  if (value >= max) return max;
  const offset = value - min;
  const steps = Number.isFinite(offset) ? offset / step : value / step - min / step;
  if (steps > Number.MAX_SAFE_INTEGER) return value;

  // Resolve half steps consistently even when the subtraction rounded down.
  const nearestStep = Math.round(steps + Number.EPSILON * Math.max(1, steps));
  const distance = nearestStep * step;
  const candidate = Number.isFinite(distance)
    ? min + distance
    : (min / 2 + (nearestStep / 2) * step) * 2;
  // A partial step at the upper end competes with the regular grid.
  const last = candidate > max ? candidate - step : candidate;
  if (max - value <= Math.abs(last - value)) return max;
  const digits = Math.max(0, decimalPlaces(min), decimalPlaces(step));
  return digits <= 100 ? Number(last.toFixed(digits)) : last;
}

export function moveBySteps(value: number, count: number, scale: SliderScale): number {
  const { min, max, step } = scale;
  const span = max - min;
  const steps = span / step;
  const candidate =
    value === max && count < 0 && Number.isFinite(steps)
      ? min + (Math.ceil(steps) + count) * step
      : value + count * step;
  return Math.max(min, Math.min(max, candidate));
}

function readNumber(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'string' && value.trim() !== '') {
    value = Number(value);
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readSelection(
  value: string | number | undefined,
  range: boolean,
  scale: SliderScale,
): SliderSelection {
  const [first, second] = typeof value === 'string' && range ? value.split(',', 2) : [value];
  const lower = snapValue(readNumber(first, scale.min), scale);
  if (!range) return [lower, lower];
  const upper = snapValue(readNumber(second, scale.max), scale);
  return [Math.min(lower, upper), Math.max(lower, upper)];
}

export function scaleFraction(value: number, { min, max }: SliderScale): number {
  if (max === min) return 0;
  const span = max - min;
  return Number.isFinite(span) ? (value - min) / span : (value / 2 - min / 2) / (max / 2 - min / 2);
}

export function formatSlider(
  locale: string | undefined,
  format: string,
  currency: string,
): Pick<Intl.NumberFormat, 'format'> {
  const isPercent = format === 'percent';
  const options: Intl.NumberFormatOptions =
    format === 'currency'
      ? { style: 'currency', currency: /^[a-z]{3}$/iu.test(currency) ? currency : 'EUR' }
      : { style: isPercent ? 'percent' : 'decimal', maximumFractionDigits: 20 };
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, options);
  } catch {
    formatter = new Intl.NumberFormat(undefined, options);
  }
  return { format: (value: number) => formatter.format(isPercent ? value / 100 : value) };
}
