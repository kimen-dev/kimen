import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-scroller',
  component: 'ki-scroller',
  parameters: {
    layout: 'centered',
  },
  args: {
    orientation: 'vertical',
    label: 'Release notes',
  },
} satisfies Meta<JSX.KiScroller>;

export default meta;
type Story = StoryObj<JSX.KiScroller>;

// Explicit demo frames (spacing tokens are not layout sizes) with a visible
// boundary so the clipping bound reads even on overlay-scrollbar platforms.
// Story text inherits body_1/high-em from the workshop canvas contract.
const frameStyle = {
  border: '1px solid var(--ki-outline-low-em)',
  borderRadius: 'var(--ki-radius-md)',
};

/**
 * Interactive playground: bounds come from the consumer's layout — size the
 * host and the indicator appears only while the content overflows.
 */
export const Playground: Story = {
  render: (args) => (
    <ki-scroller {...args} style={{ ...frameStyle, blockSize: '12rem', inlineSize: '20rem' }}>
      <div style={{ paddingInline: 'var(--ki-space-md)' }}>
        {Array.from({ length: 12 }, (_, index) => (
          <p>
            Release note {index + 1}: the indicator is the native scrollbar, restyled by tokens.
          </p>
        ))}
      </div>
    </ki-scroller>
  ),
};

/** Horizontal: the inline axis scrolls, the cross axis clips. */
export const HorizontalTimeline: Story = {
  render: (args) => (
    <ki-scroller
      {...args}
      orientation="horizontal"
      label="Weekly timeline"
      style={{ ...frameStyle, inlineSize: '20rem' }}
    >
      <div
        style={{
          display: 'flex',
          gap: 'var(--ki-space-md)',
          inlineSize: 'max-content',
        }}
      >
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div style={{ inlineSize: '5rem' }}>{day}</div>
        ))}
      </div>
    </ki-scroller>
  ),
};
