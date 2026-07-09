import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-textarea',
  component: 'ki-textarea',
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Delivery notes',
    placeholder: 'Add any special instructions',
    value: '',
    name: 'delivery-notes',
    rows: 2,
    required: false,
    readonly: false,
    disabled: false,
    autocomplete: 'street-address',
  },
} satisfies Meta<JSX.KiTextarea>;

export default meta;
type Story = StoryObj<JSX.KiTextarea>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {};

/** Stable multiline heights are expressed by rows. */
export const Rows: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', inlineSize: '24rem' }}>
      {[2, 4, 8].map((rows) => (
        <ki-textarea {...args} label={`${String(rows)} rows`} rows={rows} />
      ))}
    </div>
  ),
};

/** Placeholder text is a hint, not the accessible name. */
export const WithPlaceholder: Story = {
  args: { value: '', placeholder: 'Gate code, landmark, or delivery preference' },
};

/** Required state participates in native form validation. */
export const Required: Story = {
  args: { required: true },
};

/** Disabled fields are skipped by focus and form submission. */
export const Disabled: Story = {
  args: { disabled: true, value: 'Unavailable while shipping method is locked' },
};

/** Readonly fields remain focusable and submit their text. */
export const Readonly: Story = {
  args: { readonly: true, value: 'No refunds after 30 days' },
};

/** Long content scrolls inside the fixed-height field. */
export const LongContent: Story = {
  args: {
    rows: 4,
    value:
      'Ring twice before delivery.\nLeave the package at the back door.\nUse the side gate if the driveway is blocked.\nCall on arrival.\nDo not leave with reception.',
  },
};
