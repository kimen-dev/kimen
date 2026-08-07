import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-badge',
  component: 'ki-badge',
  parameters: {
    layout: 'centered',
    slots: {
      default: 'Beta',
    },
  },
  args: {
    tone: 'neutral',
    size: 'md',
  },
} satisfies Meta<JSX.KiBadge>;

export default meta;
type Story = StoryObj<JSX.KiBadge>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {};

/** Intent is `tone`: the full five-tone vocabulary, including info/warning. */
export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['neutral', 'success', 'danger', 'info', 'warning'] as const).map((tone) => (
        <ki-badge {...args} tone={tone}>
          {tone}
        </ki-badge>
      ))}
    </div>
  ),
};

/** Metric scale: sm and md. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['sm', 'md'] as const).map((size) => (
        <ki-badge {...args} size={size}>
          {size}
        </ki-badge>
      ))}
    </div>
  ),
};

/** The sm metrics hold across the non-neutral tones. */
export const SmallTones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['success', 'danger', 'info', 'warning'] as const).map((tone) => (
        <ki-badge {...args} size="sm" tone={tone}>
          {tone}
        </ki-badge>
      ))}
    </div>
  ),
};

// Deliberately off-vocabulary: the runtime fallback contract under test.
const legacyTone = 'legacy' as unknown as NonNullable<JSX.KiBadge['tone']>;

/** An unrecognized tone falls back to the neutral treatment by construction. */
export const UnknownToneFallback: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <ki-badge {...args} tone={legacyTone}>
        legacy
      </ki-badge>
      <ki-badge {...args} tone="neutral">
        neutral
      </ki-badge>
    </div>
  ),
};

/** Labels never wrap or truncate: the badge grows with its content. */
export const LongLabel: Story = {
  parameters: {
    slots: {
      default: 'Long-running migration in progress',
    },
  },
};
