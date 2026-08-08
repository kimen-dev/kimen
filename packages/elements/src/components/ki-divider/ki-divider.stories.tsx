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

// Section text inherits body_1/high-em from the workshop canvas contract;
// the frame width is an explicit layout size (spacing tokens are not frames).

/** Interactive playground: the single structural axis exposed as a control. */
export const Playground: Story = {
  render: (args) => (
    <div style={{ inlineSize: '15rem' }}>
      <div>Profile</div>
      <ki-divider {...args} />
      <div>Notifications</div>
    </div>
  ),
};

/** Vertical: stretches to the cross size its layout context provides. */
export const VerticalInAToolbar: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--ki-space-md)', blockSize: '2rem' }}>
      <span style={{ alignSelf: 'center' }}>Edit</span>
      <ki-divider {...args} orientation="vertical" />
      <span style={{ alignSelf: 'center' }}>Share</span>
    </div>
  ),
};
