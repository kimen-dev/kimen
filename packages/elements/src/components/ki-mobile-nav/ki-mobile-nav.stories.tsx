import '../../../icons/circle-user.js';
import '../../../icons/house.js';
import '../../../icons/inbox.js';
import '../../../icons/search.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-mobile-nav',
  component: 'ki-mobile-nav',
  args: { label: 'Main', variant: 'fixed' },
} satisfies Meta<JSX.KiMobileNav>;

export default meta;
type Story = StoryObj<JSX.KiMobileNav>;

function preview(args: JSX.KiMobileNav, dir = 'ltr') {
  return (
    <div
      dir={dir}
      style={{
        transform: 'translate(0)',
        minBlockSize: '10rem',
        maxInlineSize: '24rem',
        backgroundColor: 'var(--ki-surface-s0)',
      }}
    >
      <ki-mobile-nav {...args}>
        <ki-mobile-nav-item href="#home" iconName="house" current>
          Home
        </ki-mobile-nav-item>
        <ki-mobile-nav-item href="#search" iconName="search">
          Search
        </ki-mobile-nav-item>
        <ki-mobile-nav-item href="#inbox" iconName="inbox" count={3}>
          Inbox
        </ki-mobile-nav-item>
        <ki-mobile-nav-item href="#profile" iconName="circle-user">
          Profile
        </ki-mobile-nav-item>
      </ki-mobile-nav>
    </div>
  );
}

export const Fixed: Story = { render: (args) => preview(args) };

export const Floating: Story = {
  args: { variant: 'floating' },
  render: (args) => preview(args),
};

export const RightToLeft: Story = {
  args: { variant: 'floating' },
  render: (args) => preview(args, 'rtl'),
};
