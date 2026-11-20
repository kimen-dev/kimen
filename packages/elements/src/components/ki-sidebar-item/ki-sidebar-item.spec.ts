import { describe, expect, it } from 'vitest';
import { formatSidebarLabel, normalizeSidebarCount } from './ki-sidebar-item.label';

describe('sidebar count and label', () => {
  it('keeps positive whole counts and treats non-finite and out-of-range counts as empty', () => {
    expect([12, 3.9, 0.9, 0, -1, NaN, Infinity, undefined].map(normalizeSidebarCount)).toEqual([
      12,
      3,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('localizes the counted label without interpreting placeholders in the item text', () => {
    expect(formatSidebarLabel('{count} items', 12, '{count} unread in {label}')).toBe(
      '12 unread in {count} items',
    );
    expect(formatSidebarLabel('Inbox', undefined, '{label}, {count} new')).toBe('Inbox');
    expect(formatSidebarLabel('Inbox', 2, '{count} pending')).toBe('Inbox, 2 new');
    expect(formatSidebarLabel('Inbox', 2, '{label}')).toBe('Inbox, 2 new');
  });
});
