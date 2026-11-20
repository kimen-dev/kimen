const layoutGaps = [
  'zero',
  'xxs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
  '10xl',
  '11xl',
  '12xl',
  '13xl',
  '14xl',
  '15xl',
  '16xl',
  '17xl',
  '18xl',
  '19xl',
  '20xl',
  '21xl',
  '22xl',
  '23xl',
  '24xl',
  '25xl',
  '26xl',
] as const;

export type KiLayoutGap = (typeof layoutGaps)[number];

const steps: ReadonlySet<string> = new Set(layoutGaps);

/** Leave the default component token in effect unless a different step was chosen. */
export function layoutGapToken(gap: string, defaultGap: KiLayoutGap): string | undefined {
  return gap !== defaultGap && steps.has(gap) ? `var(--ki-layout-spacing-${gap})` : undefined;
}
