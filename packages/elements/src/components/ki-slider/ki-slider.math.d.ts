interface Scale {
  min: number;
  max: number;
  step: number;
}

export function formatSlider(
  locale: string | undefined,
  format: string,
  currency: string,
): Intl.NumberFormat;
export function normalizeScale(min: number, max: number, step: number): Scale;
export function readSelection(
  value: number | string | undefined,
  range: boolean,
  scale: Scale,
): [number, number];
export function scaleFraction(value: number, scale: Scale): number;
export function snapValue(value: number, scale: Scale): number;
