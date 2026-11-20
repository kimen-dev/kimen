import { describe, expect, it } from 'vitest';
import { formatSourceLabel, orderSources, readSourceUrl } from './sources-model';

describe('source order', () => {
  it('uses the first resolved citation, then preserves declaration order for uncited sources', () => {
    const sources = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    expect(orderSources(sources, ['b', 'missing', 'b', 'a'])).toEqual([
      { id: 'b' },
      { id: 'a' },
      { id: 'c' },
      { id: 'd' },
    ]);
  });
});

describe('source URLs', () => {
  it('resolves relative URL references and derives their hostname from the destination', () => {
    expect(readSourceUrl('../methods', 'https://docs.example.org:8443/research/findings/')).toEqual(
      {
        href: 'https://docs.example.org:8443/research/methods',
        domain: 'docs.example.org',
      },
    );
  });

  it.each(['', '  ', 'https://', 'javascript:;', 'java\tscript:;', 'data:text/plain,example'])(
    'rejects unavailable destinations such as %j',
    (href) => {
      expect(readSourceUrl(href, 'https://example.org')).toBeUndefined();
    },
  );

  it('rejects a relative URL when its base has no allowed scheme', () => {
    expect(readSourceUrl('/example', 'file:///research.html')).toBeUndefined();
  });
});

it('interpolates templates once and keeps absent placeholders and title text literal', () => {
  expect(
    formatSourceLabel('{title} [{number}] {other}', { title: 'A {number} $&', number: '1' }),
  ).toBe('A {number} $& [1] {other}');
});
