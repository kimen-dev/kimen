export type KiAlertLiveRole = 'alert' | 'status';
export type KiAlertTone = 'neutral' | 'success' | 'danger' | 'info' | 'warning';

export function liveExposureForTone(tone: string | undefined): KiAlertLiveRole {
  return tone === 'danger' || tone === 'warning' ? 'alert' : 'status';
}

// Amendment A2: each non-neutral tone draws its own Lucide glyph when nothing
// is slotted, so the tone never depends on the consumer adding an icon.
const DEFAULT_GLYPHS: Readonly<Record<string, string>> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  danger: 'octagon-alert',
};

/** The glyph a tone draws when nothing is slotted; neutral and unknown tones draw none. */
export function defaultGlyphForTone(tone: string | undefined): string | undefined {
  return tone !== undefined && Object.hasOwn(DEFAULT_GLYPHS, tone)
    ? DEFAULT_GLYPHS[tone]
    : undefined;
}
