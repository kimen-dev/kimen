import '../../../icons/inbox.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSidebarItem } from './ki-sidebar-item';

type Args = Partial<Pick<KiSidebarItem, 'href' | 'iconName' | 'count' | 'current'>>;
const meta = {
  title: 'Elements/ki-sidebar-item',
  component: 'ki-sidebar-item',
  args: { href: '#inbox', iconName: 'inbox', count: 12 },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) =>
    h('ki-sidebar', { label: 'Main', collapsible: true }, h('ki-sidebar-item', args, 'Inbox')),
};

export const Current: Story = { ...Playground, args: { current: true } };
