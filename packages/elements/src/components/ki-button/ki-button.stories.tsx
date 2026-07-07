import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-button',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-button',
  parameters: {
    layout: 'centered',
    slots: {
      default: 'Label',
    },
  },
  args: {
    variant: 'secondary',
    tone: 'neutral',
    size: 'md',
    type: 'submit',
    disabled: false,
  },
} satisfies Meta<JSX.KiButton>;

export default meta;
type Story = StoryObj<JSX.KiButton>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {};

/** The single main action of a view claims `variant="primary"`. */
export const Primary: Story = {
  args: { variant: 'primary' },
  parameters: { slots: { default: 'Save changes' } },
};

/** Emphasis scale: one button per variant, same tone and size. */
export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const).map((variant) => (
        <ki-button {...args} variant={variant}>
          {variant}
        </ki-button>
      ))}
    </div>
  ),
};

/** Intent is `tone`, never `variant`: neutral, success and danger. */
export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['neutral', 'success', 'danger'] as const).map((tone) => (
        <ki-button {...args} tone={tone}>
          {tone}
        </ki-button>
      ))}
    </div>
  ),
};

/** Size scale from xs to xl. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <ki-button {...args} size={size}>
          {size}
        </ki-button>
      ))}
    </div>
  ),
};

/** Disabled buttons keep their variant but drop interactivity. */
export const Disabled: Story = {
  args: { disabled: true },
  parameters: { slots: { default: 'Unavailable' } },
};

/** Leading and trailing media through the `start` and `end` slots. */
export const WithSlots: Story = {
  parameters: {
    slots: {
      start: <span aria-hidden="true">→</span>,
      default: 'Continue',
    },
  },
};
