import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-status',
  component: 'ki-status',
  parameters: {
    layout: 'centered',
  },
  args: {
    tone: 'neutral',
    ring: false,
    label: 'Status',
  },
} satisfies Meta<JSX.KiStatus>;

export default meta;
type Story = StoryObj<JSX.KiStatus>;

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--ki-space-md)',
  fontFamily: 'var(--ki-typography-family-body)',
  color: 'var(--ki-text-high-em)',
};

/** Interactive playground: tone, ring and the accessible label as controls. */
export const Playground: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <ki-status {...args} />
      <span>Adjacent visible text</span>
    </div>
  ),
};

/** The five-tone vocabulary, each dot named for assistive technology. */
export const Tones: Story = {
  render: () => (
    <div style={{ ...rowStyle, gap: 'var(--ki-space-4xl)' }}>
      <ki-status tone="neutral" label="Inactive" />
      <ki-status tone="success" label="Online" />
      <ki-status tone="danger" label="Build failing" />
      <ki-status tone="info" label="Syncing" />
      <ki-status tone="warning" label="Degraded" />
    </div>
  ),
};

/** Ring over media: the consumer positions the dot; the ring detaches it. */
export const RingOverAvatar: Story = {
  render: (args) => (
    <div
      style={{
        position: 'relative',
        inlineSize: 'var(--ki-space-14xl)',
        blockSize: 'var(--ki-space-14xl)',
        borderRadius: 'var(--ki-radius-round)',
        background: 'var(--ki-surface-primary-med-em)',
      }}
    >
      <ki-status
        {...args}
        tone="success"
        ring={true}
        label="Online"
        style={{ position: 'absolute', insetBlockEnd: '0', insetInlineEnd: '0' }}
      />
    </div>
  ),
};
