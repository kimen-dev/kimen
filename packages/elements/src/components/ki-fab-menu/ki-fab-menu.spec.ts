// @spec:128-ki-fab-menu
import { describe, expect, it } from 'vitest';
import { fabMenuActionValue } from './ki-fab-menu.actions';

describe('FAB menu selection values', () => {
  it('S2: preserves an explicit stable action value', () => {
    expect(fabMenuActionValue('draft:message', 'New message')).toBe('draft:message');
  });

  it('S10: uses the trimmed label when the action has no value', () => {
    expect(fabMenuActionValue(undefined, '  New event\n')).toBe('New event');
  });
});
