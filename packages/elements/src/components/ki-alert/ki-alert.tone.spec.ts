import { describe, expect, it } from 'vitest';
import { defaultGlyphForTone, liveExposureForTone } from './ki-alert.tone';

// @spec:011-ki-alert
describe('liveExposureForTone', () => {
  it('S9 maps danger to alert semantics', () => {
    expect(liveExposureForTone('danger')).toBe('alert');
  });

  it('S17 maps warning to alert semantics', () => {
    expect(liveExposureForTone('warning')).toBe('alert');
  });

  it('S10 maps success to status semantics', () => {
    expect(liveExposureForTone('success')).toBe('status');
  });

  it('S18 maps neutral info unknown and absent tones to status semantics', () => {
    expect(liveExposureForTone('neutral')).toBe('status');
    expect(liveExposureForTone('info')).toBe('status');
    expect(liveExposureForTone('banana')).toBe('status');
    expect(liveExposureForTone(undefined)).toBe('status');
  });
});

describe('defaultGlyphForTone', () => {
  it('S36 gives each non-neutral tone a glyph of its own', () => {
    expect(defaultGlyphForTone('info')).toBe('info');
    expect(defaultGlyphForTone('success')).toBe('circle-check');
    expect(defaultGlyphForTone('warning')).toBe('triangle-alert');
    expect(defaultGlyphForTone('danger')).toBe('octagon-alert');
  });

  it('S36 draws no glyph for the neutral, unknown and absent tones', () => {
    expect(defaultGlyphForTone('neutral')).toBeUndefined();
    expect(defaultGlyphForTone('banana')).toBeUndefined();
    expect(defaultGlyphForTone('toString')).toBeUndefined();
    expect(defaultGlyphForTone(undefined)).toBeUndefined();
  });
});
