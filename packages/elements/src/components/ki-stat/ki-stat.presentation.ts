/** Format Stat's visible reading and its spoken equivalent with the same options. */
export function formatStatNumber(
  value: number | undefined,
  locale?: string,
  unit?: string,
  options?: Intl.NumberFormatOptions,
  magnitude = false,
): string | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  const formatter = numberFormatter(validLocale(locale), options, magnitude);
  const formatted = formatter.format(magnitude ? Math.abs(value) : value);
  const suffix = unit?.trim();
  return suffix && formatter.resolvedOptions().style === 'decimal'
    ? `${formatted} ${suffix}`
    : formatted;
}

function validLocale(locale: string | undefined): string | undefined {
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

function numberFormatter(
  locale: string | undefined,
  options: Intl.NumberFormatOptions | undefined,
  magnitude: boolean,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(
      locale,
      magnitude ? { ...options, signDisplay: 'never' } : options,
    );
  } catch {
    return new Intl.NumberFormat(locale);
  }
}

interface DeltaPresentation {
  icon: 'trending-up' | 'trending-down' | undefined;
  tone: 'neutral' | 'success' | 'danger';
}

export function deltaPresentation(delta: number, direction: string): DeltaPresentation {
  if (delta === 0) {
    return { icon: undefined, tone: 'neutral' };
  }

  const rising = delta > 0;
  const favorable = direction === 'lower-is-better' ? !rising : rising;
  return {
    icon: rising ? 'trending-up' : 'trending-down',
    tone: direction === 'neutral' ? 'neutral' : favorable ? 'success' : 'danger',
  };
}
