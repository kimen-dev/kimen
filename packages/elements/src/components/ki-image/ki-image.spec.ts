import { describe, expect, it } from 'vitest';

import { offendingScheme } from '../../utils/url-scheme';

describe('image URL scheme policy', () => {
  it.each([
    '/hills.jpg',
    './hills.jpg',
    '//images.example/hills.jpg',
    'HtTpS://images.example/hills.jpg',
    'http://images.example/hills.jpg',
  ])('permits %s', (source) => {
    expect(offendingScheme(source)).toBeNull();
  });

  it.each([
    ['data:image/png;base64,AA==', 'data'],
    ['blob:local-image', 'blob'],
    ['ftp://images.example/hills.jpg', 'ftp'],
    [' \tDa\nTa:image/png;base64,AA==', 'data'],
  ])('identifies the refused scheme in %s', (source, scheme) => {
    expect(offendingScheme(source)).toBe(scheme);
  });
});
