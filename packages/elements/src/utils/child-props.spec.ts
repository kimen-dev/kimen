import { describe, expect, it } from 'vitest';
import { childDisabled, childValue } from './child-props';

/** A child as its parent sees it: properties it may carry, attributes it may have. */
function aChild(
  properties: { value?: unknown; disabled?: unknown } = {},
  attributes: Record<string, string> = {},
) {
  return {
    ...properties,
    getAttribute: (name: string) => attributes[name] ?? null,
    hasAttribute: (name: string) => name in attributes,
  };
}

describe('childValue', () => {
  it('reads the property a framework assigned before the child reflected it', () => {
    expect(childValue(aChild({ value: 'fr' }))).toBe('fr');
  });

  it('prefers the property over an attribute the child has not updated yet', () => {
    expect(childValue(aChild({ value: 'fr' }, { value: 'es' }))).toBe('fr');
  });

  it('keeps an empty string property as a value of its own', () => {
    expect(childValue(aChild({ value: '' }, { value: 'es' }))).toBe('');
  });

  it('falls back to the attribute of a child that is not upgraded yet', () => {
    expect(childValue(aChild({}, { value: 'es' }))).toBe('es');
  });

  it.each([undefined, null, 5, {}])('ignores a property that is not a string (%s)', (value) => {
    expect(childValue(aChild({ value }, { value: 'es' }))).toBe('es');
  });

  it('answers null when the child carries no value at all', () => {
    expect(childValue(aChild())).toBeNull();
  });
});

describe('childDisabled', () => {
  it('reads the property a framework assigned before the child reflected it', () => {
    expect(childDisabled(aChild({ disabled: true }))).toBe(true);
  });

  it('keeps presence semantics: a present attribute disables whatever the property says', () => {
    expect(childDisabled(aChild({ disabled: false }, { disabled: 'false' }))).toBe(true);
    expect(childDisabled(aChild({}, { disabled: '' }))).toBe(true);
  });

  it('answers false for an enabled child', () => {
    expect(childDisabled(aChild({ disabled: false }))).toBe(false);
    expect(childDisabled(aChild())).toBe(false);
  });

  it.each(['true', 1, {}])(
    'takes only the boolean true as a disabled property (%s)',
    (disabled) => {
      expect(childDisabled(aChild({ disabled }))).toBe(false);
    },
  );
});
