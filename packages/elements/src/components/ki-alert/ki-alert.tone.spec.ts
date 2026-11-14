import { describe, expect, it } from 'vitest';
import { liveExposureForTone } from './ki-alert.tone';

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
