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

export const Playground: Story = {
  render: () => (
    <ki-list style={frameStyle}>
      <ki-list-item>
        <span slot="start">AG</span>
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
