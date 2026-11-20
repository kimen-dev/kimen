import { describe, expect, it } from 'vitest';

import { pageHref, pageItems, paginationState } from './ki-pagination.model';

describe('numbered page ranges', () => {
  it.each([
    [5, 12, 1, 1, [1, 'gap', 4, 5, 6, 'gap', 12]],
    [1, 12, 1, 1, [1, 2, 'gap', 12]],
    [12, 12, 1, 1, [1, 'gap', 11, 12]],
    [4, 6, 1, 1, [1, 2, 3, 4, 5, 6]],
    [5, 12, 0, 2, [1, 2, 'gap', 5, 'gap', 11, 12]],
    [5, 12, 0, 0, ['gap', 5, 'gap']],
    [1, 1, 1, 1, [1]],
  ] as const)(
    'renders page %i of %i with %i siblings and %i boundaries',
    (page, pages, siblings, boundaries, expected) => {
      expect(pageItems(page, pages, siblings, boundaries)).toEqual(expected);
    },
  );

  it('bounds the visible range even when the total and window properties are huge', () => {
    const items = pageItems(100, Number.MAX_SAFE_INTEGER, 1e12, 1e12);
    expect(items).toHaveLength(43);
    expect(items[0]).toBe(1);
    expect(items.at(-1)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('normalizes invalid, fractional and out-of-range page values', () => {
    expect(paginationState(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ page: 0, pages: 0 });
    expect(paginationState(-2, 10)).toEqual({ page: 1, pages: 10 });
    expect(paginationState(2.9, 10.9)).toEqual({ page: 2, pages: 10 });
    expect(paginationState(15, 10)).toEqual({ page: 10, pages: 10 });
    expect(paginationState(undefined, undefined)).toEqual({ page: 0, pages: 0 });
  });
});

describe('page links', () => {
  const base = 'https://example.test/results';
  it.each([
    ['?page={page}', '?page=6'],
    ['/results/{page}#page-{page}', '/results/6#page-6'],
    ['https://example.test/results?page={page}', 'https://example.test/results?page=6'],
  ])('expands a page within %s', (template, expected) => {
    expect(pageHref(template, 6, base)).toBe(expected);
  });

  it.each([
    '',
    '?page=6',
    'java\tscript:{page}',
    'https://{page}.example.test/',
    'https://example.test:{page}/',
    'https://[unclosed/{page}',
  ])('falls back to a button for an invalid template (%j)', (template) => {
    expect(pageHref(template, 6, base)).toBeUndefined();
  });
});
