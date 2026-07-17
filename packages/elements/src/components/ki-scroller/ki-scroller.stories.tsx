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

const proseStyle = {
  fontFamily: 'var(--ki-typography-family-body)',
  color: 'var(--ki-text-high-em)',
};

/**
 * Interactive playground: bounds come from the consumer's layout — size the
 * host and the indicator appears only while the content overflows.
 */
export const Playground: Story = {
  render: (args) => (
    <ki-scroller
      {...args}
      style={{ blockSize: 'var(--ki-space-24xl)', inlineSize: 'var(--ki-space-26xl)' }}
    >
      <div style={proseStyle}>
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
      style={{ inlineSize: 'var(--ki-space-26xl)' }}
    >
      <div
        style={{
          display: 'flex',
          gap: 'var(--ki-space-md)',
          inlineSize: 'max-content',
          ...proseStyle,
        }}
      >
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div style={{ inlineSize: 'var(--ki-space-22xl)' }}>{day}</div>
        ))}
      </div>
    </ki-scroller>
  ),
};
