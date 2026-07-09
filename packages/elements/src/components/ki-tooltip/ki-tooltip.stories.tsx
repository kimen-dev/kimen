import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-tooltip',
  component: 'ki-tooltip',
  parameters: {
    layout: 'centered',
    slots: {
      default: <button type="button">Send</button>,
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

export const Playground: Story = {};

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
          <button type="button">{placement}</button>
        </ki-tooltip>
      ))}
    </div>
  ),
};

export const ViewportEdge: Story = {
  args: { placement: 'top' },
  render: (args) => (
    <div style={{ minBlockSize: '10rem', minInlineSize: '20rem' }}>
      <ki-tooltip {...args}>
        <button type="button">Edge</button>
      </ki-tooltip>
    </div>
  ),
};

export const KeyboardParity: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <ki-tooltip {...args}>
        <button type="button">Send</button>
      </ki-tooltip>
      <button type="button">Next</button>
    </div>
  ),
};

export const RTL: Story = {
  args: { placement: 'start' },
  render: (args) => (
    <div dir="rtl">
      <ki-tooltip {...args}>
        <button type="button">إرسال</button>
      </ki-tooltip>
    </div>
  ),
};

export const InsideDialog: Story = {
  render: (args) => (
    <dialog open>
      <ki-tooltip {...args}>
        <button type="button">Send</button>
      </ki-tooltip>
      <button type="button">Close</button>
    </dialog>
  ),
};
