import { describe, expect, it } from 'vitest';

import { getCardHref, getCardTitle } from './card-interaction';

describe('ki-card interaction inputs', () => {
  it('keeps nonblank destinations and treats blank href as absent', () => {
    expect(getCardHref('/incidents/42')).toBe('/incidents/42');
    expect(getCardHref('  #incident-42 ')).toBe('#incident-42');
    expect(getCardHref(' \n ')).toBeUndefined();
    expect(getCardHref(undefined)).toBeUndefined();
  });

  it('keeps the authored heading level and trims its title', () => {
    expect(getCardTitle('h3', ' Search index rebuild ')).toEqual({
      tag: 'h3',
      text: 'Search index rebuild',
    });
    expect(getCardTitle('h6', 'Report')).toEqual({ tag: 'h6', text: 'Report' });
  });

  it('does not create a title from an empty heading or another element', () => {
    expect(getCardTitle('h2', '  ')).toBeUndefined();
    expect(getCardTitle('p', 'Report')).toBeUndefined();
    expect(getCardTitle(undefined, null)).toBeUndefined();
  });
});
