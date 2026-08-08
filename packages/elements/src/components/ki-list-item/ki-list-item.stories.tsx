import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// ki-list-item is list-scoped (role="listitem"): every story renders it inside
// its required ki-list parent, the only supported composition.
const meta = {
  title: 'Elements/ki-list-item',
  component: 'ki-list-item',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<JSX.KiListItem>;

export default meta;
type Story = StoryObj<JSX.KiListItem>;

const frameStyle = {
  inlineSize: '22rem',
  display: 'block',
};

// The end-slot switch keeps its accessible name through visually hidden
// slotted label text instead of duplicating the row's visible primary text.
const visuallyHidden = {
  position: 'absolute',
  inlineSize: '1px',
  blockSize: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

export const Playground: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>
        {/* Visible primary text names the identity, so the avatar is
            decorative (no label) per ki-avatar's labeling contract. */}
        <ki-avatar slot="start" initials="AG" size="sm" />
        Ana Garcia
        <span slot="secondary">ana@onmars.dev</span>
        <span slot="end">9:41</span>
      </ki-list-item>
    </ki-list>
  ),
};

export const PrimaryTextOnly: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>Notifications</ki-list-item>
    </ki-list>
  ),
};

export const SecondaryLine: Story = {
  // The secondary slot's presence selects the multi-line min-height token.
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>
        Storage
        <span slot="secondary">4.2 GB of 15 GB used</span>
      </ki-list-item>
    </ki-list>
  ),
};

/** Start icon at the catalog 18px icon size plus an end-slot control. */
export const IconAndControl: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>
        <svg
          slot="start"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ inlineSize: '1.125rem', blockSize: '1.125rem', display: 'block' }}
        >
          <path
            d="M12 3a6 6 0 0 0-6 6v3.5L4.5 16h15L18 12.5V9a6 6 0 0 0-6-6Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" />
        </svg>
        Notifications
        <span slot="secondary">Immediate push alerts</span>
        <ki-switch slot="end" name="push" checked>
          <span style={visuallyHidden}>Notifications</span>
        </ki-switch>
      </ki-list-item>
    </ki-list>
  ),
};
