import { describe, expect, it } from 'vitest';
import { effectiveDuration, KI_TOAST_DEFAULT_DURATION, liveRoleForTone } from './ki-toast.timing';

// @spec:049-ki-toast
describe('effectiveDuration', () => {
  it('S3 honors an explicit duration in milliseconds', () => {
    expect(effectiveDuration(4000, 'neutral', false)).toBe(4000);
  });

  it('S4 gives a toast without a duration five seconds', () => {
    expect(KI_TOAST_DEFAULT_DURATION).toBe(5000);
    expect(effectiveDuration(undefined, 'info', false)).toBe(5000);
    expect(effectiveDuration(undefined, undefined, false)).toBe(5000);
    expect(effectiveDuration(undefined, 'banana', false)).toBe(5000);
  });

  it('S5 lets a toast with an action, in the danger tone or with duration 0 wait', () => {
    expect(effectiveDuration(undefined, 'neutral', true)).toBeNull();
    expect(effectiveDuration(undefined, 'danger', false)).toBeNull();
    expect(effectiveDuration(0, 'neutral', false)).toBeNull();
  });

  it('S5 ignores an explicit duration on a toast with an action or in the danger tone', () => {
    expect(effectiveDuration(4000, 'neutral', true)).toBeNull();
    expect(effectiveDuration(4000, 'danger', false)).toBeNull();
  });

  it('S4 treats negative, non-numeric and infinite durations as unset', () => {
    expect(effectiveDuration(-1, 'neutral', false)).toBe(5000);
    expect(effectiveDuration(Number.NaN, 'neutral', false)).toBe(5000);
    expect(effectiveDuration(Number.POSITIVE_INFINITY, 'neutral', false)).toBe(5000);
    expect(effectiveDuration(null, 'warning', false)).toBe(5000);
  });
});

describe('liveRoleForTone', () => {
  it('S28 exposes a danger toast assertively', () => {
    expect(liveRoleForTone('danger')).toBe('alert');
  });

  it('S27 exposes neutral, info, success, warning, unknown and absent tones politely', () => {
    expect(liveRoleForTone('neutral')).toBe('status');
    expect(liveRoleForTone('info')).toBe('status');
    expect(liveRoleForTone('success')).toBe('status');
    expect(liveRoleForTone('warning')).toBe('status');
    expect(liveRoleForTone('banana')).toBe('status');
    expect(liveRoleForTone(undefined)).toBe('status');
  });
});
