import { describe, expect, it } from 'vitest';

import { accordionName } from './accordion-group';

describe('accordion name grouping', () => {
  it('reuses a name for the same accordion across membership changes', () => {
    const accordion = {};
    const name = accordionName(accordion);
    expect(name).not.toBe('');
    expect(accordionName(accordion)).toBe(name);
  });

  it('assigns distinct names to distinct accordions', () => {
    expect(accordionName({})).not.toBe(accordionName({}));
  });
});
