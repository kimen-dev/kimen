import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSidebarGroup } from './ki-sidebar-group';

type Args = Pick<KiSidebarGroup, 'label'>;
const meta = {
  title: 'Elements/ki-sidebar-group',
  component: 'ki-sidebar-group',
  args: { label: 'Workspace' },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) =>
    h(
      'ki-sidebar',
      { label: 'Main' },
      h(
        'ki-sidebar-group',
        args,
        h('ki-sidebar-item', { href: '#members', current: true }, 'Members'),
        h('ki-sidebar-item', { href: '#settings' }, 'Settings'),
      ),
    ),
};
