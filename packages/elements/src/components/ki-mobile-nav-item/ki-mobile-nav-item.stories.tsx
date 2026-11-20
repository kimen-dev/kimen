import '../../../icons/house.js';
import '../../../icons/inbox.js';
import '../../../icons/search.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-mobile-nav-item',
  component: 'ki-mobile-nav-item',
  args: { href: '#inbox', iconName: 'inbox', count: 3, current: true },
} satisfies Meta<JSX.KiMobileNavItem>;

export default meta;
type Story = StoryObj<JSX.KiMobileNavItem>;

export const Destination: Story = {
  render: (args) => (
    <div
      style={{
        transform: 'translate(0)',
        minBlockSize: '8rem',
        maxInlineSize: '24rem',
        backgroundColor: 'var(--ki-surface-s0)',
      }}
    >
      <ki-mobile-nav label="Main">
        <ki-mobile-nav-item href="#home" iconName="house">
          Home
        </ki-mobile-nav-item>
        <ki-mobile-nav-item href="#search" iconName="search">
          Search
        </ki-mobile-nav-item>
        <ki-mobile-nav-item {...args}>Inbox</ki-mobile-nav-item>
      </ki-mobile-nav>
    </div>
  ),
};

export const AbbreviatedCount: Story = {
  ...Destination,
  args: { ...meta.args, count: 125 },
};
