import { describe, expect, it } from 'vitest';
import { layoutGapToken } from '../../utils/layout-gap';

describe('layout gap token selection', () => {
  it.each(['zero', 'sm', '26xl'] as const)('selects the semantic token for %s', (gap) => {
    expect(layoutGapToken(gap, 'md')).toBe(`var(--ki-layout-spacing-${gap})`);
  });

  it.each(['md', '1rem', 'minus-md', '27xl', 'constructor'])(
    'leaves the default token in place for %s',
    (gap) => {
      expect(layoutGapToken(gap, 'md')).toBeUndefined();
    },
  );
});
