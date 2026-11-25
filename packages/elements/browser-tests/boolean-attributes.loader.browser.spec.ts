// Boolean attributes through the lazy loader (`@kimen/elements/loader`), on
// every component that declares one: see boolean-attributes.ts. The loader
// registers its own definitions, so this file defines nothing else.
import { afterEach, beforeAll, expect, it } from 'vitest';

import { defineCustomElements } from '../loader/index.js';
import {
  booleanAttributesByTag,
  expectBooleanAttributes,
  unknownExceptions,
} from './boolean-attributes';

beforeAll(async () => {
  await defineCustomElements();
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
