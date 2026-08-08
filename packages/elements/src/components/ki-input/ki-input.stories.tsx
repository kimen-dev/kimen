import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-input',
  // Tag string, not the class: elements are registered lazily by the loader
  // in .storybook/preview.ts (the package never auto-defines, Art. IX).
  component: 'ki-input',
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Email',
    type: 'email',
    placeholder: '',
    name: 'email',
    value: '',
    required: false,
    readonly: false,
    disabled: false,
    autocomplete: 'email',
  },
} satisfies Meta<JSX.KiInput>;

export default meta;
type Story = StoryObj<JSX.KiInput>;

/** Interactive playground: every prop exposed as a control. */
export const Playground: Story = {};

/** Native single-line entry kinds supported in v1. */
export const Types: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: '0.75rem', inlineSize: '22rem' }}>
      {(['text', 'email', 'password', 'url', 'tel', 'search'] as const).map((type) => (
        <ki-input {...args} label={type} type={type} value={type === 'password' ? 'secret' : ''} />
      ))}
    </div>
  ),
};

/** Placeholder is only a hint; the label remains the accessible name. */
export const WithPlaceholder: Story = {
  args: { placeholder: 'name@example.com', value: '' },
};

/** Required participates in native constraint validation. */
export const Required: Story = {
  args: { required: true },
};

/** Disabled fields are unavailable and excluded from form data. */
export const Disabled: Story = {
  args: { disabled: true, value: 'ada@example.com' },
};

/** Readonly fields remain focusable and submit their value. */
export const Readonly: Story = {
  args: { readonly: true, value: 'KMN-0042', label: 'Membership ID', name: 'id' },
};

/**
 * Leading and trailing adornments through the `start` and `end` slots. The
 * start icon is a directly slotted SVG so the component's own slotted-icon
 * box sizes it; the text affix renders at the cell type scale (13/24) in the
 * muted label emphasis.
 */
export const Adornments: Story = {
  render: (args) => (
    <ki-input {...args} label="Search" type="search" placeholder="Search">
      <svg slot="start" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span slot="end" aria-hidden="true">
        Cmd K
      </span>
    </ki-input>
  ),
};

/** The :focus-within active treatment: field ring and focus palette. */
export const Focused: Story = {
  play: async ({ canvasElement }) => {
    // One frame lets the upfront-registered element finish its first render;
    // delegated focus lands on the inner input and drives :focus-within.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    canvasElement.querySelector('ki-input')?.focus();
  },
};
