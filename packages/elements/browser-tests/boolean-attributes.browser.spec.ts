// Boolean attributes through the per-component modules (`@kimen/elements/ki-*`),
// on every component that declares one: see boolean-attributes.ts.
import { afterEach, beforeAll, expect, it } from 'vitest';

import { defineAllComponents } from './all-components';
import {
  booleanAttributesByTag,
  booleanContractCases,
  expectBooleanContract,
  expectFalseAttributes,
  expectUncheckedReset,
} from './boolean-attributes';

// @spec:005-ki-select
// @spec:006-ki-checkbox
// @spec:007-ki-radio-group
// @spec:008-ki-switch
// @spec:012-ki-dialog
// @spec:014-ki-tabs
// @spec:077-ki-checkbox-group
// @spec:082-ki-segmented-control
// @spec:095-ki-combobox
// @spec:097-ki-table
// @spec:102-ki-slider
// @spec:109-ki-file-upload
// @spec:110-ki-sources
// @spec:022-ki-icon-button
// @spec:049-ki-toast
// @spec:099-ki-search
// @spec:123-ki-carousel
// @spec:127-ki-code-block
// @spec:128-ki-fab-menu
const scenarios: Readonly<Record<string, string>> = {
  'ki-select': 'S28',
  'ki-option': 'S28',
  'ki-checkbox': 'S24',
  'ki-radio-group': 'S31',
  'ki-radio': 'S31',
  'ki-switch': 'S27',
  'ki-dialog': 'S17',
  'ki-tab': 'S20',
  'ki-checkbox-group': 'S16',
  'ki-segment': 'S16',
  'ki-combobox': 'S19',
  'ki-table': 'S19',
  'ki-slider': 'S13',
  'ki-file-upload': 'S13',
  'ki-sources': 'S16',
  'ki-icon-button': 'S20',
  'ki-toast': 'S46',
  'ki-search': 'S22',
  'ki-carousel': 'S25',
  'ki-code-block': 'S17',
  'ki-fab-menu': 'S17',
};

const titleFor = (tag: string): string => {
  const scenario = scenarios[tag];
  return scenario === undefined ? tag : `${scenario} ${tag}`;
};

beforeAll(() => {
  defineAllComponents();
});

afterEach(() => {
  document.body.replaceChildren();
});

it('covers the boolean properties of every component that declares one', () => {
  expect(booleanAttributesByTag.size).toBeGreaterThan(60);
});

it.each([...booleanAttributesByTag].map(([tag, attrs]) => [titleFor(tag), tag, attrs] as const))(
  '%s reads attr="false" as false and restores defaults on removal',
  async (_title, tag, attrs) => {
    await expectFalseAttributes(tag, attrs);
  },
);

it.each(booleanContractCases.map(([tag, names]) => [titleFor(tag), tag, names] as const))(
  '%s applies the boolean attribute rule',
  async (_title, tag, names) => {
    await expectBooleanContract(tag, names);
  },
);

it.each(['ki-checkbox', 'ki-switch'] as const)(
  '%s resets checked="false" to unchecked',
  expectUncheckedReset,
);
