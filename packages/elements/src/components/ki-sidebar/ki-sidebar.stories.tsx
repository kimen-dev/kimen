import '../../../icons/circle-user.js';
import '../../../icons/house.js';
import '../../../icons/inbox.js';
import '../../../icons/users.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSidebar } from './ki-sidebar';

type Args = Pick<KiSidebar, 'label' | 'collapsible' | 'collapsed'> & { dir?: 'rtl' };

const meta = {
  title: 'Elements/ki-sidebar',
  component: 'ki-sidebar',
  args: { label: 'Main', collapsible: true, collapsed: false },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) =>
    h(
      'ki-sidebar',
      args,
      h('span', { slot: 'brand' }, 'Kimen'),
      h('ki-sidebar-item', { href: '#home', iconName: 'house', current: true }, 'Home'),
      h('ki-sidebar-item', { href: '#inbox', iconName: 'inbox', count: 12 }, 'Inbox'),
      h(
        'ki-sidebar-group',
        { label: 'Workspace' },
        h('ki-sidebar-item', { href: '#members', iconName: 'users' }, 'Members'),
      ),
      h(
        'ki-icon-button',
        { slot: 'footer', variant: 'ghost', label: 'Account: Ana Garcia' },
        h('ki-icon', { name: 'circle-user' }),
      ),
    ),
};

export const Rail: Story = { ...Playground, args: { collapsed: true } };
export const RightToLeft: Story = { ...Playground, args: { dir: 'rtl' } };
