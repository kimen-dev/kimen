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
  // A real 14px icon (the master's media metric) instead of a text glyph; the
  // tab does not size slotted media, so the story provides the icon box.
  render: (args) => (
    <ki-tabs label="Settings" value="email">
      <ki-tab {...args}>
        <svg
          slot="start"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ inlineSize: '0.875rem', blockSize: '0.875rem', display: 'block' }}
        >
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2" />
          <path
            d="m4 7 8 6 8-6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
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
