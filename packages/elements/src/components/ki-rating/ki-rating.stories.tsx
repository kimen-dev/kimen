import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiRating } from './ki-rating';

type Args = Pick<KiRating, 'label' | 'value' | 'precision' | 'readonly' | 'disabled'>;
type Story = StoryObj<Args>;

const meta: Meta<Args> = {
  title: 'Elements/ki-rating',
  component: 'ki-rating',
  parameters: { layout: 'centered' },
  args: { label: 'How useful was this answer?' },
  render: (args) => h('ki-rating', args),
};

export default meta;

export const Playground: Story = {};
export const Average: Story = {
  args: { label: 'Average review score', value: 4.3, readonly: true },
};
export const HalfSteps: Story = {
  args: { precision: 0.5, value: 2.5 },
};
export const Disabled: Story = {
  args: { label: 'Feedback closed', value: 3, disabled: true },
};
export const RightToLeft: Story = {
  args: { value: 2.5, precision: 0.5 },
  render: (args) => <div dir="rtl">{h('ki-rating', args)}</div>,
};
