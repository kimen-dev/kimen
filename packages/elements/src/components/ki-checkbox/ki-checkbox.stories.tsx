import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

interface KiCheckboxStoryArgs {
  checked: boolean;
  disabled: boolean;
  indeterminate: boolean;
  name: string;
  required: boolean;
  value: string;
}

const meta = {
  title: 'Elements/ki-checkbox',
  component: 'ki-checkbox',
  parameters: {
    layout: 'centered',
    slots: {
      default: 'Email notifications',
    },
  },
  args: {
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
    name: 'notifications',
    value: 'email',
  },
} satisfies Meta<KiCheckboxStoryArgs>;

export default meta;
type Story = StoryObj<KiCheckboxStoryArgs>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {};

/** Binary and mixed selection presentations side by side. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {h('ki-checkbox', args, 'Unchecked')}
      {h('ki-checkbox', { ...args, checked: true }, 'Checked')}
      {h('ki-checkbox', { ...args, indeterminate: true }, 'Indeterminate')}
    </div>
  ),
};

/** Required checkboxes participate in native constraint validation. */
export const Required: Story = {
  args: { required: true, name: 'terms', value: 'accepted' },
  parameters: { slots: { default: 'Accept the terms' } },
};

/** Disabled checkboxes are unavailable and skipped by keyboard navigation. */
export const Disabled: Story = {
  args: { disabled: true },
  parameters: { slots: { default: 'Unavailable option' } },
};

/** Parent/child partial selection is application-level wiring. */
export const SelectAll: Story = {
  render: () => {
    const children = [
      { label: 'Product updates', checked: true },
      { label: 'Security alerts', checked: true },
      { label: 'Research invitations', checked: false },
    ];

    return (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {h('ki-checkbox', { indeterminate: true }, 'Select all notifications')}
        {children.map((child) => h('ki-checkbox', { checked: child.checked }, child.label))}
      </div>
    );
  },
};
