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

export const Playground: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>
        <span slot="start">AG</span>
        Ana Garcia
        <span slot="secondary">ana@onmars.dev</span>
        <span slot="end">9:41</span>
      </ki-list-item>
      <ki-list-item>
        <span slot="start">MK</span>
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
      {[
        ['AG', 'Ana Garcia', 'ana@onmars.dev', '9:41'],
        ['MK', 'Mina Kapoor', 'mina@onmars.dev', '10:12'],
        ['JL', 'Jules Lee', 'jules@onmars.dev', 'Yesterday'],
      ].map(([avatar, name, email, time]) => (
        <ki-list-item>
          <span slot="start">{avatar}</span>
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
        <input slot="end" role="switch" aria-label="Email alerts" type="checkbox" checked />
      </ki-list-item>
      <ki-list-item>
        Weekly summary
        <span slot="secondary">A digest every Friday morning</span>
        <input slot="end" role="switch" aria-label="Weekly summary" type="checkbox" />
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
