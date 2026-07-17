import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const closeIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
);

const meta = {
  title: 'Elements/ki-icon-button',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-icon-button',
  parameters: {
    layout: 'centered',
    // One vnode only: parameters.slots.default accepts a single node.
    slots: {
      default: closeIcon,
    },
  },
  args: {
    variant: 'secondary',
    tone: 'neutral',
    size: 'md',
    label: 'Close',
    disabled: false,
  },
} satisfies Meta<JSX.KiIconButton>;

export default meta;
type Story = StoryObj<JSX.KiIconButton>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {};

/** The single main action of a view claims `variant="primary"`. */
export const Primary: Story = {
  args: { variant: 'primary' },
};

/** Emphasis scale: one icon button per variant, same tone and size. */
export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const).map((variant) => (
        <ki-icon-button {...args} variant={variant} label={variant}>
          {closeIcon}
        </ki-icon-button>
      ))}
    </div>
  ),
};

/** Intent is `tone`, never `variant`: neutral, success and danger. */
export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['neutral', 'success', 'danger'] as const).map((tone) => (
        <ki-icon-button {...args} tone={tone} label={tone}>
          {closeIcon}
        </ki-icon-button>
      ))}
    </div>
  ),
};

/** Size scale from xs (24px, the pointer-target floor) to xl (56px). */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <ki-icon-button {...args} size={size} label={size}>
          {closeIcon}
        </ki-icon-button>
      ))}
    </div>
  ),
};

/** Disabled icon buttons keep their variant but drop interactivity. */
export const Disabled: Story = {
  args: { disabled: true, label: 'Unavailable' },
};
