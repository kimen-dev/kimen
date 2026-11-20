import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiFormatNumber } from './ki-format-number';

type Args = Pick<
  KiFormatNumber,
  | 'value'
  | 'formatStyle'
  | 'currency'
  | 'unit'
  | 'notation'
  | 'minimumFractionDigits'
  | 'maximumFractionDigits'
>;

const meta = {
  title: 'Elements/ki-format-number',
  component: 'ki-format-number',
  args: { value: 1284.5 },
} satisfies Meta<Args>;

export default meta;

export const Decimal: StoryObj<Args> = {
  render: (args) => h('ki-format-number', args),
};

export const Currency: StoryObj<Args> = {
  ...Decimal,
  args: { value: 49, currency: 'EUR' },
};

export const Percent: StoryObj<Args> = {
  ...Decimal,
  args: { value: 0.496, formatStyle: 'percent', maximumFractionDigits: 1 },
};

export const Unit: StoryObj<Args> = {
  ...Decimal,
  args: { value: 23, formatStyle: 'unit', unit: 'celsius' },
};

export const Compact: StoryObj<Args> = {
  ...Decimal,
  args: { value: 59320, notation: 'compact' },
};
