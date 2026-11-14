import { describe, expect, it } from 'vitest';
import { parseDelay } from './ki-tooltip.delay';

// @spec:013-ki-tooltip
describe('parseDelay', () => {
  it('S1 parses tokenized show and hide delays', () => {
    expect(parseDelay('150ms')).toBe(150);
    expect(parseDelay('0.15s')).toBe(150);
    expect(parseDelay('')).toBe(0);
    expect(parseDelay('later')).toBe(0);
  });
});
