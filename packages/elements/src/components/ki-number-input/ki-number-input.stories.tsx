import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiNumberInput } from './ki-number-input';

type Args = Pick<
  KiNumberInput,
  | 'label'
  | 'value'
  | 'min'
  | 'max'
  | 'step'
  | 'steppers'
  | 'unit'
  | 'format'
  | 'helpText'
  | 'errorText'
  | 'customError'
  | 'required'
  | 'disabled'
>;

const meta = {
  title: 'Elements/ki-number-input',
  component: 'ki-number-input',
  args: { label: 'Seats', value: 3, min: 1, max: 50, step: 1, steppers: true },
} satisfies Meta<Args>;

export default meta;

export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-number-input', args),
};

export const WithUnit: StoryObj<Args> = {
  args: {
    label: 'Timeout',
    value: 30,
    unit: 'seconds',
    steppers: false,
    helpText: 'Time before stopping',
  },
  render: (args) => h('ki-number-input', args),
};

export const CustomError: StoryObj<Args> = {
  args: { label: 'Seats', value: 42, customError: 'Only 40 seats left.' },
  render: (args) => h('ki-number-input', args),
};

export const Percentage: StoryObj<Args> = {
  args: {
    label: 'Discount',
    value: 0.125,
    min: 0,
    max: 1,
    step: 0.005,
    format: { style: 'percent', maximumFractionDigits: 1 },
  },
  render: (args) => h('ki-number-input', { ...args, lang: 'de-DE' }),
};

export const Bounds: StoryObj<Args> = {
  render: () =>
    h(
      'div',
      { style: { display: 'flex', gap: 'var(--ki-space-xl)', flexWrap: 'wrap' } },
      h('ki-number-input', { label: 'Minimum seats', value: 1, min: 1, max: 50, steppers: true }),
      h('ki-number-input', { label: 'Maximum seats', value: 50, min: 1, max: 50, steppers: true }),
      h('ki-number-input', { label: 'Unavailable', value: 10, steppers: true, disabled: true }),
    ),
};
