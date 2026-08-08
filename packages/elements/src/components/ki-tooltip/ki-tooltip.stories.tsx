import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// Triggers stay NATIVE buttons on purpose: ki-tooltip reflects `label` to the
// trigger's `aria-description`, and that reflection cannot cross into a
// focus-delegating custom element's shadow root (documented limitation in
// ki-tooltip.tsx), so ki-button would silently drop the announcement. The
// story styles the native button with tokens so the catalog still reads as
// MarsUI around the component under test.
const triggerStyle = {
  font: 'inherit',
  paddingBlock: 'var(--ki-space-sm)',
  paddingInline: 'var(--ki-space-2xl)',
  border: '1px solid var(--ki-outline-low-em)',
  borderRadius: 'var(--ki-radius-md)',
  background: 'var(--ki-surface-s1)',
  color: 'var(--ki-text-high-em)',
  cursor: 'pointer',
};

// Keyboard parity is the component's own contract: focusing the slotted
// trigger shows the bubble immediately (focusin path, no show delay), so the
// tooltip surface is actually visible in captures.
const focusTrigger = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  // One frame lets the upfront-registered elements finish their first render.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  canvasElement.querySelector('button')?.focus();
};

const meta = {
  title: 'Elements/ki-tooltip',
  component: 'ki-tooltip',
  parameters: {
    layout: 'centered',
    slots: {
      default: (
        <button type="button" style={triggerStyle}>
          Send
        </button>
      ),
    },
  },
  args: {
    label: 'Send immediately',
    placement: 'top',
  },
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'start', 'end'],
    },
  },
} satisfies Meta<JSX.KiTooltip>;

export default meta;
type Story = StoryObj<JSX.KiTooltip>;

export const Playground: Story = {
  play: focusTrigger,
};

export const Placements: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: '2rem',
        gridTemplateColumns: 'repeat(2, max-content)',
        placeItems: 'center',
      }}
    >
      {(['top', 'bottom', 'start', 'end'] as const).map((placement) => (
        <ki-tooltip {...args} placement={placement}>
          <button type="button" style={triggerStyle}>
            {placement}
          </button>
        </ki-tooltip>
      ))}
    </div>
  ),
  // Focus is exclusive, so a single bubble (the first placement) is shown;
  // the controls panel drives the other placements interactively.
  play: focusTrigger,
};

export const ViewportEdge: Story = {
  args: { placement: 'top' },
  render: (args) => (
    <div style={{ minBlockSize: '10rem', minInlineSize: '20rem' }}>
      <ki-tooltip {...args}>
        <button type="button" style={triggerStyle}>
          Edge
        </button>
      </ki-tooltip>
    </div>
  ),
  play: focusTrigger,
};

export const KeyboardParity: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <ki-tooltip {...args}>
        <button type="button" style={triggerStyle}>
          Send
        </button>
      </ki-tooltip>
      <button type="button" style={triggerStyle}>
        Next
      </button>
    </div>
  ),
  play: focusTrigger,
};

export const RTL: Story = {
  args: { placement: 'start' },
  render: (args) => (
    <div dir="rtl">
      <ki-tooltip {...args}>
        <button type="button" style={triggerStyle}>
          إرسال
        </button>
      </ki-tooltip>
    </div>
  ),
  play: focusTrigger,
};

export const InsideDialog: Story = {
  render: (args) => (
    // A token-styled non-modal dialog: it proves the tooltip positions inside
    // a native <dialog> without making the docs page inert the way an open
    // modal ki-dialog would.
    <dialog
      open
      style={{
        position: 'static',
        display: 'flex',
        gap: 'var(--ki-space-md)',
        padding: 'var(--ki-space-4xl)',
        border: '1px solid var(--ki-outline-low-em)',
        borderRadius: 'var(--ki-radius-lg)',
        background: 'var(--ki-surface-s1)',
        color: 'var(--ki-text-high-em)',
      }}
    >
      <ki-tooltip {...args}>
        <button type="button" style={triggerStyle}>
          Send
        </button>
      </ki-tooltip>
      <button type="button" style={triggerStyle}>
        Close
      </button>
    </dialog>
  ),
  play: focusTrigger,
};
