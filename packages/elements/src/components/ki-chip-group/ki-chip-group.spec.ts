import { describe, expect, it } from 'vitest';
import { adjacentIndex, positionAnnouncement } from './ki-chip-group.keyboard';

describe('chip reorder', () => {
  it.each([
    ['ArrowRight', 'ltr', 0, 3, 1],
    ['ArrowLeft', 'rtl', 0, 3, 1],
    ['ArrowRight', 'rtl', 2, 3, 1],
    ['ArrowLeft', 'ltr', 0, 3, 0],
    ['ArrowRight', 'ltr', 2, 3, 2],
  ] as const)('moves %s in %s from position %i', (key, dir, index, count, expected) => {
    expect(adjacentIndex(key, dir, index, count)).toBe(expected);
  });

  it('substitutes localized label and position in one pass', () => {
    expect(positionAnnouncement('{position}/{total}. {label}', 'Team {total}', 1, 3)).toBe(
      '2/3. Team {total}',
    );
  });
});
