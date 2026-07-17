import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// ki-option never renders standalone: the owning ki-select mirrors its label
// and value, so every story hosts the args-driven option inside a select. The
// meta render returns fresh vnodes per call (autodocs renders all stories on
// one page and Stencil vnodes are mutated in place).
const meta = {
  title: 'Elements/ki-option',
  component: 'ki-option',
  parameters: {
    layout: 'centered',
  },
  args: {
    value: 'es',
    disabled: false,
  },
  render: (args) => (
    <ki-select label="Country" placeholder="Choose a country" name="country">
      <ki-option {...args}>Spain</ki-option>
      <ki-option value="fr">France</ki-option>
      <ki-option value="pt">Portugal</ki-option>
    </ki-select>
  ),
} satisfies Meta<JSX.KiOption>;

export default meta;
type Story = StoryObj<JSX.KiOption>;

export const Playground: Story = {};

export const LabelFallbackValue: Story = {
  // Without `value`, the option submits its trimmed label text, matching
  // native <option> parity (omitting the attribute is the supported shape,
  // so this story renders without spreading `value` at all).
  render: (args) => (
    <ki-select label="Country" placeholder="Choose a country" name="country">
      <ki-option disabled={args.disabled ?? false}>Spain</ki-option>
      <ki-option value="fr">France</ki-option>
      <ki-option value="pt">Portugal</ki-option>
    </ki-select>
  ),
};

export const DisabledOption: Story = {
  args: { disabled: true },
};
