import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// ki-radio never renders standalone: selection state belongs to the parent
// ki-radio-group's `value`, so every story hosts the args-driven radio inside
// a group. Fresh sibling vnodes per render (autodocs renders all stories on
// one page and Stencil vnodes are mutated in place).
const meta = {
  title: 'Elements/ki-radio',
  component: 'ki-radio',
  parameters: {
    layout: 'centered',
  },
  args: {
    value: 'email',
    disabled: false,
  },
  render: (args) => (
    <ki-radio-group label="Contact preference" name="contact" value="email">
      <ki-radio {...args}>Email</ki-radio>
      <ki-radio value="sms">SMS</ki-radio>
      <ki-radio value="phone">Phone</ki-radio>
    </ki-radio-group>
  ),
} satisfies Meta<JSX.KiRadio>;

export default meta;
type Story = StoryObj<JSX.KiRadio>;

export const Playground: Story = {};

export const DisabledOption: Story = {
  // Disabled options are skipped by the group's arrow-key navigation.
  args: { disabled: true },
};
