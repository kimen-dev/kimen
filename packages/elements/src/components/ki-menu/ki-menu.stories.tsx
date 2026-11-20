import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-menu',
  component: 'ki-menu',
  parameters: { layout: 'padded' },
  args: { filterLabel: 'Filter actions', placement: 'bottom-start' },
} satisfies Meta<JSX.KiMenu>;

export default meta;
type Story = StoryObj<JSX.KiMenu>;

export const Playground: Story = {
  render: (args) => (
    <div style={{ paddingBlockEnd: 'var(--ki-size-surface-xs)' }}>
      <ki-button id="story-menu-actions" type="button" variant="quaternary">
        Actions
      </ki-button>
      <ki-menu {...args} anchor="story-menu-actions">
        <ki-menu-group label="Edit">
          <ki-menu-item value="rename" shortcut="F2">
            Rename
          </ki-menu-item>
          <ki-menu-item value="duplicate">Duplicate</ki-menu-item>
          <ki-menu-item value="move" disabled>
            Move to…
          </ki-menu-item>
          <ki-menu-item value="pin" type="checkbox" checked>
            Pin to sidebar
          </ki-menu-item>
        </ki-menu-group>
        <ki-divider />
        <ki-menu-item value="delete" tone="danger">
          Delete
        </ki-menu-item>
      </ki-menu>
    </div>
  ),
};

export const Account: Story = {
  args: { filterLabel: '' },
  render: (args) => (
    <div style={{ paddingBlockEnd: 'var(--ki-size-surface-xs)' }}>
      <ki-button id="story-menu-account" type="button" variant="ghost">
        Account
      </ki-button>
      <ki-menu {...args} anchor="story-menu-account">
        <div
          slot="header"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--ki-space-md)' }}
        >
          <ki-avatar initials="AG" size="md" />
          <span>Ana García</span>
        </div>
        <ki-divider />
        <ki-menu-item value="profile">Profile</ki-menu-item>
        <ki-menu-group label="Density">
          <ki-menu-item value="compact" type="radio" checked>
            Compact
          </ki-menu-item>
          <ki-menu-item value="comfortable" type="radio">
            Comfortable
          </ki-menu-item>
        </ki-menu-group>
      </ki-menu>
    </div>
  ),
};
