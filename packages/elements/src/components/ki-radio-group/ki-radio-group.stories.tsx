import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-radio-group',
  component: 'ki-radio-group',
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Contact preference',
    name: 'contact',
    value: 'email',
    required: false,
    disabled: false,
  },
} satisfies Meta<JSX.KiRadioGroup>;

export default meta;
type Story = StoryObj<JSX.KiRadioGroup>;

function Options(): HTMLElement[] {
  return [
    <ki-radio value="email">Email</ki-radio>,
    <ki-radio value="sms">SMS</ki-radio>,
    <ki-radio value="phone">Phone</ki-radio>,
  ];
}

export const Playground: Story = {
  render: (args) => <ki-radio-group {...args}>{Options()}</ki-radio-group>,
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-5xl)' }}>
      <ki-radio-group {...args} value="">
        {Options()}
      </ki-radio-group>
      <ki-radio-group {...args} value="sms">
        {Options()}
      </ki-radio-group>
    </div>
  ),
};

export const DisabledOption: Story = {
  render: (args) => (
    <ki-radio-group {...args} value="email">
      <ki-radio value="email">Email</ki-radio>
      <ki-radio value="sms" disabled>
        SMS
      </ki-radio>
      <ki-radio value="phone">Phone</ki-radio>
    </ki-radio-group>
  ),
};

export const DisabledGroup: Story = {
  args: { disabled: true },
  render: (args) => <ki-radio-group {...args}>{Options()}</ki-radio-group>,
};

export const Required: Story = {
  args: { required: true, value: '' },
  render: (args) => (
    <form>
      <ki-radio-group {...args}>{Options()}</ki-radio-group>
      <ki-button type="submit" variant="primary">
        Submit
      </ki-button>
    </form>
  ),
};

export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <ki-radio-group {...args}>{Options()}</ki-radio-group>
    </div>
  ),
};
