import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-divider',
  component: 'ki-divider',
  parameters: {
    layout: 'centered',
  },
  args: {
    orientation: 'horizontal',
  },
} satisfies Meta<JSX.KiDivider>;

export default meta;
type Story = StoryObj<JSX.KiDivider>;

const sectionStyle = {
  fontFamily: 'var(--ki-typography-family-body)',
  color: 'var(--ki-text-high-em)',
};

/** Interactive playground: the single structural axis exposed as a control. */
export const Playground: Story = {
  render: (args) => (
    <div style={{ inlineSize: 'var(--ki-space-26xl)', ...sectionStyle }}>
      <div>Profile</div>
      <ki-divider {...args} />
      <div>Notifications</div>
    </div>
  ),
};

/** Vertical: stretches to the cross size its layout context provides. */
export const VerticalInAToolbar: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--ki-space-md)', ...sectionStyle }}>
      <span>Edit</span>
      <ki-divider {...args} orientation="vertical" />
      <span>Share</span>
    </div>
  ),
};
