import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-indicator',
  component: 'ki-indicator',
  parameters: {
    layout: 'centered',
  },
  args: {
    count: 5,
    current: 2,
    label: 'Slide position',
  },
} satisfies Meta<JSX.KiIndicator>;

export default meta;
type Story = StoryObj<JSX.KiIndicator>;

/** Interactive playground: count, the 1-based current position and the label. */
export const Playground: Story = {
  render: (args) => <ki-indicator {...args} />,
};

/** The highlight walks the sequence; out-of-range declarations clamp. */
export const Positions: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-md)', justifyItems: 'center' }}>
      <ki-indicator count={4} current={1} label="Slide position" />
      <ki-indicator count={4} current={2} label="Slide position" />
      <ki-indicator count={4} current={4} label="Slide position" />
      <ki-indicator count={4} current={9} label="Slide position (clamped)" />
    </div>
  ),
};

/** Composed under a slide: the carousel owns navigation and announcements. */
export const UnderASlide: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-lg)', justifyItems: 'center' }}>
      <div
        style={{
          inlineSize: 'var(--ki-space-26xl)',
          blockSize: 'var(--ki-space-24xl)',
          borderRadius: 'var(--ki-radius-lg)',
          background: 'var(--ki-surface-primary-low-em)',
        }}
      ></div>
      <ki-indicator {...args} count={5} current={2} label="Slide position" />
    </div>
  ),
};
