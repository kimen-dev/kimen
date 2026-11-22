import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiDatePicker } from './ki-date-picker';

type Args = Pick<
  KiDatePicker,
  | 'label'
  | 'value'
  | 'mode'
  | 'name'
  | 'locale'
  | 'min'
  | 'max'
  | 'helpText'
  | 'errorText'
  | 'customError'
  | 'required'
  | 'disabled'
  | 'confirm'
>;

const meta = {
  title: 'Elements/ki-date-picker',
  component: 'ki-date-picker',
  render: (args) => h('ki-date-picker', args),
} satisfies Meta<Args>;

export default meta;

export const Single: StoryObj<Args> = {
  args: { label: 'Departure', locale: 'en-GB', value: '2026-11-20', helpText: 'Use DD/MM/YYYY.' },
};

export const ConfirmedRange: StoryObj<Args> = {
  args: {
    label: 'Stay',
    locale: 'en-GB',
    mode: 'range',
    confirm: true,
    value: '2026-11-12/2026-11-16',
    min: '2026-11-10',
    max: '2026-11-30',
  },
};

export const Required: StoryObj<Args> = {
  args: {
    label: 'Departure',
    name: 'departure',
    required: true,
    errorText: 'Enter a valid departure date.',
  },
  render: (args) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <ki-date-picker {...args} />
      <ki-button type="submit">Check availability</ki-button>
    </form>
  ),
};

export const RightToLeft: StoryObj<Args> = {
  args: { label: 'Departure', locale: 'en-GB', value: '2026-11-20' },
  render: (args) => (
    <div dir="rtl">
      <ki-date-picker {...args} />
    </div>
  ),
};

export const Disabled: StoryObj<Args> = {
  args: { label: 'Departure', locale: 'en-GB', value: '2026-11-20', disabled: true },
};
