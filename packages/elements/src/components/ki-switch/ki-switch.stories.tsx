import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-switch',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-switch',
  parameters: {
    layout: 'centered',
    slots: {
      default: 'Email notifications',
    },
  },
  args: {
    checked: false,
    disabled: false,
    name: 'notifications',
    value: 'on',
  },
} satisfies Meta<JSX.KiSwitch>;

export default meta;
type Story = StoryObj<JSX.KiSwitch>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {};

/** Off and on switches share the same markup surface. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <ki-switch {...args}>Email notifications</ki-switch>
      <ki-switch {...args} checked>
        Dark mode
      </ki-switch>
    </div>
  ),
};

/** Disabled switches preserve state while dropping interactivity. */
export const Disabled: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <ki-switch {...args} disabled>
        Email notifications
      </ki-switch>
      <ki-switch {...args} checked disabled>
        Dark mode
      </ki-switch>
    </div>
  ),
};

/** Native form participation: name, value, and reset. */
export const InForm: Story = {
  render: (args) => (
    <form>
      <ki-switch {...args} name="newsletter" value="weekly">
        Weekly newsletter
      </ki-switch>
      <ki-button type="reset">Reset</ki-button>
    </form>
  ),
};

/** Logical layout mirrors under RTL. */
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <ki-switch {...args} checked>
        Email notifications
      </ki-switch>
    </div>
  ),
};
