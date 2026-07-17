import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// ki-tab never renders standalone: it pairs with a ki-tab-panel through a
// shared `value` inside ki-tabs, and `selected` is output-only (written by the
// group), so every story hosts the args-driven tab inside a full group.
const meta = {
  title: 'Elements/ki-tab',
  component: 'ki-tab',
  parameters: {
    layout: 'centered',
  },
  args: {
    value: 'email',
    disabled: false,
  },
  render: (args) => (
    <ki-tabs label="Settings" value="email">
      <ki-tab {...args}>Email</ki-tab>
      <ki-tab value="notifications">Notifications</ki-tab>
      <ki-tab-panel value="email">Email delivery preferences</ki-tab-panel>
      <ki-tab-panel value="notifications">Notification routing preferences</ki-tab-panel>
    </ki-tabs>
  ),
} satisfies Meta<JSX.KiTab>;

export default meta;
type Story = StoryObj<JSX.KiTab>;

export const Playground: Story = {};

export const WithStartMedia: Story = {
  render: (args) => (
    <ki-tabs label="Settings" value="email">
      <ki-tab {...args}>
        <span slot="start" aria-hidden="true">
          @
        </span>
        Email
      </ki-tab>
      <ki-tab value="notifications">Notifications</ki-tab>
      <ki-tab-panel value="email">Email delivery preferences</ki-tab-panel>
      <ki-tab-panel value="notifications">Notification routing preferences</ki-tab-panel>
    </ki-tabs>
  ),
};

export const DisabledTab: Story = {
  // A disabled tab stays visible but cannot be selected by any modality; the
  // group falls back to the first selectable tab.
  args: { disabled: true },
};
