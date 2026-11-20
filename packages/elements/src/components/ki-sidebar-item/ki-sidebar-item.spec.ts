import { describe, expect, it } from 'vitest';
import { normalizeSidebarCount, sidebarCountLabelParts } from './ki-sidebar-item.label';

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

  it('keeps the live label between the localized parts in the requested order', () => {
    expect(sidebarCountLabelParts('Inbox', 12, '{count} unread in {label}')).toEqual([
      '12 unread in ',
      '',
    ]);
    expect(sidebarCountLabelParts('{count} items', 12, '{label}: {count} in {label}')).toEqual([
      '',
      ': 12 in {count} items',
    ]);
  });

  it('uses the default count wording for an incomplete template and omits empty counts', () => {
    expect(sidebarCountLabelParts('Inbox', undefined, '{label}, {count} new')).toEqual(['', '']);
    expect(sidebarCountLabelParts('Inbox', 2, '{count} pending')).toEqual(['', ', 2 new']);
    expect(sidebarCountLabelParts('Inbox', 2, '{label}')).toEqual(['', ', 2 new']);
  });
});
