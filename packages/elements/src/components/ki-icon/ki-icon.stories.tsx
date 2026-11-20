import '../../../icons/circle-check.js';
import '../../../icons/info.js';
import '../../../icons/triangle-alert.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-icon',
  component: 'ki-icon',
  args: { name: 'triangle-alert', size: 'lg', label: 'Warning' },
  argTypes: {
    name: { control: 'select', options: ['circle-check', 'info', 'triangle-alert'] },
    size: { control: 'select', options: ['inherit', 'sm', 'md', 'lg'] },
  },
} satisfies Meta<JSX.KiIcon>;

export default meta;
type Story = StoryObj<JSX.KiIcon>;

export const Playground: Story = {
  render: (args) => <ki-icon {...args} />,
};

export const Decorative: Story = {
  render: () => (
    <span style={{ color: 'var(--ki-text-success-high-em)' }}>
      <ki-icon name="circle-check" /> Confirmed
    </span>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ki-space-md)' }}>
      <ki-icon name="info" size="sm" />
      <ki-icon name="info" size="md" />
      <ki-icon name="info" size="lg" />
      <span>
        <ki-icon name="info" /> Help
      </span>
    </div>
  ),
};
