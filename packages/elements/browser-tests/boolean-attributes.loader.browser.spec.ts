// Boolean attributes through the lazy loader (`@kimen/elements/loader`), on
// every component that declares one: see boolean-attributes.ts. The loader
// registers its own definitions, so this file defines nothing else.
import { afterEach, beforeAll, expect, it } from 'vitest';

import { defineCustomElements } from '../loader/index.js';
import {
  booleanAttributesByTag,
  booleanContractCases,
  expectBooleanContract,
  expectFalseAttributes,
  expectUncheckedReset,
} from './boolean-attributes';

beforeAll(async () => {
  await defineCustomElements();
});

afterEach(() => {
  document.body.replaceChildren();
});

it('covers the boolean properties of every component that declares one', () => {
  expect(booleanAttributesByTag.size).toBeGreaterThan(60);
});

it.each([...booleanAttributesByTag])(
  '%s reads attr="false" as false and restores defaults on removal',
  expectFalseAttributes,
);

it.each(booleanContractCases)('%s applies the boolean attribute rule', async (tag, names) => {
  await expectBooleanContract(tag, names);
});

it.each(['ki-checkbox', 'ki-switch'] as const)(
  '%s resets checked="false" to unchecked',
  expectUncheckedReset,
);
