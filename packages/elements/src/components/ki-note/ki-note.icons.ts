export type KiNoteTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

export const infoGlyph = 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5m0-8v.1';
export const sparklesGlyph =
  'm10 3 1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8L10 3Zm8 10 1 2.9 3 1.1-3 1-1 3-1-3-3-1 3-1.1 1-2.9Z';
export const circleCheckGlyph = 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 12l2.6 2.6L16 9.5';
export const triangleAlertGlyph =
  'M10.5 4.8a1.7 1.7 0 0 1 3 0l8 13.4a1.7 1.7 0 0 1-1.5 2.5H4a1.7 1.7 0 0 1-1.5-2.5l8-13.4ZM12 9.5v4m0 3.5v.1';
export const circleAlertGlyph = 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7.5V13m0 3.5v.1';

const glyphs = {
  info: infoGlyph,
  primary: sparklesGlyph,
  success: circleCheckGlyph,
  warning: triangleAlertGlyph,
  danger: circleAlertGlyph,
} satisfies Record<Exclude<KiNoteTone, 'neutral'>, string>;

export function noteGlyph(tone: string): string {
  return Object.hasOwn(glyphs, tone) ? glyphs[tone as keyof typeof glyphs] : glyphs.info;
}
