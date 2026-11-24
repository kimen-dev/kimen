import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const variants = ['primary', 'secondary', 'quaternary', 'ghost', 'outline'] as const;

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
    toggle: false,
    selected: false,
  },
  argTypes: { variant: { control: 'select', options: [...variants] } },
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

/** The five current variants, with the same tone and size. */
export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {variants.map((variant) => (
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

/** Activate repeatedly to switch the pressed state while keeping the same label. */
export const Toggle: Story = {
  args: { toggle: true, selected: true, variant: 'outline' },
  parameters: { slots: { default: 'Pin' } },
};

/** A call to action that navigates: `href` renders a native link with the button look. */
export const Link: Story = {
  args: { variant: 'primary', href: '#get-started' },
  parameters: { slots: { default: 'Get started' } },
};

/**
 * The alignment tokens start-align a wide two-line choice; `::part(button)`
 * lets it fill its container.
 */
export const StartAligned: Story = {
  render: (args) => (
    <div style={{ inlineSize: '20rem' }}>
      <style>{'.choice::part(button) { inline-size: 100%; }'}</style>
      <ki-button
        {...args}
        class="choice"
        variant="outline"
        toggle
        style={{
          display: 'block',
          '--ki-button-justify-content': 'start',
          '--ki-button-text-align': 'start',
        }}
      >
        <strong>Starter</strong>
        <br />
        One agent, one repository
      </ki-button>
    </div>
  ),
};

/** The invoker and footer action control a modal by ID. */
export const DialogTrigger: Story = {
  render: (args, { id }) => {
    const dialogId = `${id}-dialog`;
    return (
      <div>
        <ki-button {...args} commandfor={dialogId} command="show-modal">
          Preview draft
        </ki-button>
        <ki-dialog id={dialogId} heading="Draft preview">
          <p>This draft is visible only to you.</p>
          <ki-button slot="footer" commandfor={dialogId} command="close">
            Done
          </ki-button>
        </ki-dialog>
      </div>
    );
  },
};

/**
 * Leading and trailing media through the `start` and `end` slots. The start
 * media is a directly slotted SVG so the component's slotted-icon box (18px
 * at md) sizes it, matching the Figma Icon/Placeholder exercise.
 */
export const WithSlots: Story = {
  parameters: {
    slots: {
      start: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12h14m-6-6 6 6-6 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      ),
      default: 'Continue',
    },
  },
};
