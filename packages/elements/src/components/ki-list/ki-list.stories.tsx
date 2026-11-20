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
    <ki-list style={frameStyle} label="Notifications">
      <ki-list-item>
        Email alerts
        <span slot="secondary">Product updates and account activity</span>
        <ki-switch slot="end" name="alerts" checked />
      </ki-list-item>
      <ki-list-item>
        Weekly summary
        <span slot="secondary">A digest every Friday morning</span>
        <ki-switch slot="end" name="summary" />
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

export const Navigation: Story = {
  render: () => (
    <ki-list style={frameStyle} label="Settings">
      <ki-list-item href="#account">
        Account
        <span slot="secondary">Name, email, password</span>
      </ki-list-item>
      <ki-list-item href="#appearance">Appearance</ki-list-item>
    </ki-list>
  ),
};

export const SingleSelection: Story = {
  render: () => (
    <ki-list style={frameStyle} label="Delivery method" selection="single" name="delivery">
      <ki-list-item value="email" selected>
        Email
      </ki-list-item>
      <ki-list-item value="push">Push notification</ki-list-item>
    </ki-list>
  ),
};

export const MultipleSelection: Story = {
  render: () => (
    <ki-list style={frameStyle} label="Reviewers" selection="multiple" name="reviewers">
      <ki-list-item value="ana" selected>
        Ana Garcia
      </ki-list-item>
      <ki-list-item value="luis">Luis Perez</ki-list-item>
      <ki-list-item value="sara" disabled>
        Sara Martin
      </ki-list-item>
    </ki-list>
  ),
};
