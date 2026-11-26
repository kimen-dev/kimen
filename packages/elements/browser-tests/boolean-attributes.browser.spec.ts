// Boolean attributes through the per-component modules (`@kimen/elements/ki-*`),
// on every component that declares one: see boolean-attributes.ts.
import { afterEach, beforeAll, expect, it } from 'vitest';

import { defineAllComponents } from './all-components';
import {
  booleanAttributesByTag,
  expectBooleanAttributes,
  unknownExceptions,
} from './boolean-attributes';

beforeAll(() => {
  defineAllComponents();
});

afterEach(() => {
  document.body.replaceChildren();
});

it('covers the boolean properties of every component that declares one', () => {
  expect(booleanAttributesByTag.size).toBeGreaterThan(60);
  expect(unknownExceptions()).toEqual([]);
});

it.each([...booleanAttributesByTag])(
  '%s reads "false" and a missing attribute as false',
  async (tag, attributes) => {
    await expectBooleanAttributes(tag, attributes);
  },
);
