import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-counter',
  component: 'ki-counter',
  args: { value: 3, max: 99, tone: 'danger', dot: false },
} satisfies Meta<JSX.KiCounter>;

export default meta;
type Story = StoryObj<JSX.KiCounter>;

export const Playground: Story = {
  render: (args) => <ki-counter {...args} />,
};

export const NotificationButton: Story = {
  render: () => (
    <ki-icon-button variant="secondary" label="Messages, 120 unread">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M3 4h18v12H9l-6 4V4Z" stroke-width="2" stroke-linejoin="round" />
      </svg>
      <ki-counter slot="counter" value={120} />
    </ki-icon-button>
  ),
};

export const AvatarPresence: Story = {
  render: () => (
    <ki-avatar initials="AG" label="Ana García, online">
      <ki-counter slot="counter" tone="success" dot />
    </ki-avatar>
  ),
};
