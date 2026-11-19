interface NumberCodec {
  display(value: number): string;
  edit(value: number): string;
  parse(text: string): number | undefined;
}

const decimalPattern = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/iu;
const directionMarks = /[\u061c\u200e\u200f\u2066-\u2069]/gu;

/** Decompose a decimal string without first rounding it to a JS number. */
function decimalParts(text: string) {
  const match = decimalPattern.exec(text);
  if (!match) return undefined;
  const [, sign = '', integer = '', fraction = '', exponent = '0'] = match;
  const digits = `${integer}${fraction}`;
  return digits ? { sign, digits, power: Number(exponent) - fraction.length } : undefined;
}

function decimalString(sign: string, digits: string, power: number): string {
  const significant = digits.replace(/^0+/u, '') || '0';
  if (significant === '0') return `${sign}0`;
  const point = significant.length + power;
  if (point < -5 || point > 21) return `${sign}${significant}e${String(power)}`;
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${significant}`;
  if (point >= significant.length) return `${sign}${significant}${'0'.repeat(power)}`;
  return `${sign}${significant.slice(0, point)}.${significant.slice(point)}`;
}

export function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readNumberAttribute(value: string | null): number | undefined {
  const text = value?.trim() ?? '';
  return decimalParts(text) ? finiteNumber(Number(text)) : undefined;
}

export function readNumberFormat(source: string | null): Intl.NumberFormatOptions | undefined {
  if (!source) return undefined;
  try {
    const options: unknown = JSON.parse(source);
    if (typeof options === 'object' && options !== null && !Array.isArray(options)) {
      return options;
    }
  } catch {
    // Malformed attribute text leaves the default number display in place.
  }
  return undefined;
}

function formatter(locale?: string, options?: Intl.NumberFormatOptions) {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return undefined;
  }
}

export function createNumberCodec(
  locale?: string,
  options?: Intl.NumberFormatOptions,
): NumberCodec {
  const plain = formatter(locale) ?? new Intl.NumberFormat();
  const formatted = options ? formatter(plain.resolvedOptions().locale, options) : undefined;
  const settings = (formatted ?? plain).resolvedOptions();
  const symbols = new Intl.NumberFormat(settings.locale, {
    numberingSystem: settings.numberingSystem,
  });
  const parts = symbols.formatToParts(-1234567890.1);
  const part = (type: Intl.NumberFormatPartTypes, fallback: string) =>
    parts.find((entry) => entry.type === type)?.value ?? fallback;
  const minus = part('minusSign', '-');
  const decimal = part('decimal', '.');
  const group = parts.find((entry) => entry.type === 'group')?.value;
  const lengths = parts
    .filter((entry) => entry.type === 'integer')
    .map(({ value }) => Array.from(value).length);
  const primary = lengths.at(-1) ?? 3;
  const secondary = lengths.at(-2) ?? primary;
  const escaped = (symbol: string) => symbol.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const grouped =
    group === undefined
      ? undefined
      : new RegExp(
          `^[+-]?\\d{1,${String(secondary)}}(?:${escaped(group)}\\d{${String(secondary)}})*${escaped(group)}\\d{${String(primary)}}(?:${escaped(decimal)}\\d*)?(?:e[+-]?\\d+)?$`,
          'iu',
        );
  const digits = Array.from({ length: 10 }, (_, digit) => symbols.format(digit));
  const percent = settings.style === 'percent' ? 2 : 0;
  const affixes = [1, -1, 1234.5, -1234.5].flatMap((sample) =>
    (formatted?.formatToParts(sample) ?? [])
      .filter(({ type }) => type === 'currency' || type === 'unit' || type === 'percentSign')
      .map(({ value }) => value),
  );

  function edit(value: number): string {
    const text = String(value);
    const parsed = decimalParts(text);
    const raw =
      percent && parsed ? decimalString(parsed.sign, parsed.digits, parsed.power + percent) : text;
    return raw.replace(/[0-9.]/gu, (symbol) =>
      symbol === '.' ? decimal : (digits[Number(symbol)] ?? symbol),
    );
  }

  function parse(text: string): number | undefined {
    let value = text.replace(directionMarks, '').trim();
    const accounting =
      settings.currencySign === 'accounting' && value.startsWith('(') && value.endsWith(')');
    if (accounting) value = value.slice(1, -1).trim();
    for (const affix of affixes) {
      const sign = value.startsWith(minus) || value.startsWith('+') ? (value[0] ?? '') : '';
      const unsigned = value.slice(sign.length);
      if (unsigned.startsWith(affix)) {
        value = `${sign}${unsigned.slice(affix.length).trimStart()}`;
        break;
      }
      if (value.endsWith(affix)) {
        value = value.slice(0, -affix.length).trimEnd();
        break;
      }
    }
    if (minus !== '-') value = value.replaceAll(minus, '-');
    for (const [digit, localized] of digits.entries()) {
      value = value.replaceAll(localized, String(digit));
    }
    if (group?.trim() === '') value = value.replace(/[\u0020\u00a0\u202f]/gu, group);
    if (group !== undefined && value.includes(group)) {
      if (!grouped?.test(value)) return undefined;
      value = value.replaceAll(group, '');
    }
    if (decimal !== '.') value = value.replaceAll(decimal, '.');
    const parsed = decimalParts(accounting ? `-${value}` : value);
    if (!parsed) return undefined;
    return finiteNumber(Number(`${parsed.sign}${parsed.digits}e${String(parsed.power - percent)}`));
  }

  return { display: (value) => formatted?.format(value) ?? edit(value), edit, parse };
}

export function numberBounds(
  minimum: unknown,
  maximum: unknown,
): [number | undefined, number | undefined] {
  const min = finiteNumber(minimum);
  const max = finiteNumber(maximum);
  return [min, max !== undefined && min !== undefined && max < min ? undefined : max];
}

export function clampNumber(value: number, min?: number, max?: number): number {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));
}

export function stepNumber(
  value: number | undefined,
  step: number,
  count: number,
  minimum?: number,
  maximum?: number,
): number {
  const [min, max] = numberBounds(minimum, maximum);
  const start = value ?? clampNumber(0, min, max);
  const current = decimalParts(String(start));
  const increment = decimalParts(String(Number.isFinite(step) && step > 0 ? step : 1));
  if (!current || !increment) return start;

  // Align base-10 scales before adding so consecutive steps don't accumulate
  // binary floating-point noise (for example 0.1 + 0.2).
  const power = Math.min(current.power, increment.power);
  const units = (parts: typeof current) =>
    BigInt(`${parts.sign}${parts.digits}`) * 10n ** BigInt(parts.power - power);
  const result = Number(
    `${String(units(current) + units(increment) * BigInt(count))}e${String(power)}`,
  );
  return finiteNumber(clampNumber(result, min, max)) ?? start;
}
