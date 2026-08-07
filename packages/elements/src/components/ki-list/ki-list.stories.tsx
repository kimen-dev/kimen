import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-list',
  component: 'ki-list',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<JSX.KiList>;

export default meta;
type Story = StoryObj<JSX.KiList>;

const frameStyle = {
  inlineSize: '22rem',
  display: 'block',
};

// The row's visible primary text already names the identity, so the leading
// avatar is decorative (no label) per ki-avatar's own labeling contract.
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
        <ki-avatar slot="start" initials="AG" size="sm" />
        Ana Garcia
        <span slot="secondary">ana@onmars.dev</span>
        <span slot="end">9:41</span>
      </ki-list-item>
      <ki-list-item>
        <ki-avatar slot="start" initials="MK" size="sm" />
        Mina Kapoor
        <span slot="secondary">mina@onmars.dev</span>
        <span slot="end">10:12</span>
      </ki-list-item>
      <ki-list-item>Storage</ki-list-item>
    </ki-list>
  ),
};

export const Contacts: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      {(
        [
          ['AG', 'Ana Garcia', 'ana@onmars.dev', '9:41'],
          ['MK', 'Mina Kapoor', 'mina@onmars.dev', '10:12'],
          ['JL', 'Jules Lee', 'jules@onmars.dev', 'Yesterday'],
        ] as const
      ).map(([initials, name, email, time]) => (
        <ki-list-item>
          <ki-avatar slot="start" initials={initials} size="sm" />
          {name}
          <span slot="secondary">{email}</span>
          <span slot="end">{time}</span>
        </ki-list-item>
      ))}
    </ki-list>
  ),
};

export const Settings: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>
        Email alerts
        <span slot="secondary">Product updates and account activity</span>
        <ki-switch slot="end" name="alerts" checked>
          <span style={visuallyHidden}>Email alerts</span>
        </ki-switch>
      </ki-list-item>
      <ki-list-item>
        Weekly summary
        <span slot="secondary">A digest every Friday morning</span>
        <ki-switch slot="end" name="summary">
          <span style={visuallyHidden}>Weekly summary</span>
        </ki-switch>
      </ki-list-item>
    </ki-list>
  ),
};

export const TextOnly: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>Email</ki-list-item>
      <ki-list-item>Notifications</ki-list-item>
      <ki-list-item>Storage</ki-list-item>
    </ki-list>
  ),
};

export const LongSecondary: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>
        Storage
        <span slot="secondary">
          This supporting line is intentionally long so it wraps across multiple lines and grows the
          item vertically without truncation.
        </span>
      </ki-list-item>
    </ki-list>
  ),
};
