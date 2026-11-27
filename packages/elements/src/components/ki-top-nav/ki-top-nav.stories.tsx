import '../../../icons/archive.js';
import '../../../icons/arrow-left.js';
import '../../../icons/bell.js';
import '../../../icons/pencil.js';
import '../../../icons/search.js';
import '../../../icons/share-2.js';
import '../../../icons/star.js';

import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-top-nav',
  component: 'ki-top-nav',
} satisfies Meta<JSX.KiTopNav>;

export default meta;
type Story = StoryObj<JSX.KiTopNav>;

export const Header: Story = {
  args: { label: 'Workspace', collapseAt: '32rem' },
  render: (args) => (
    <ki-top-nav {...args}>
      <a slot="brand" href="#home">
        Kimen
      </a>
      <a href="#overview" aria-current="page">
        Overview
      </a>
      <a href="#projects">Projects</a>
      <a href="#reports">Reports</a>
      <ki-icon-button slot="actions" variant="ghost" label="Notifications, 3 unread">
        <ki-icon name="bell" />
        <ki-counter slot="counter" value={3} />
      </ki-icon-button>
    </ki-top-nav>
  ),
};

export const CompactHeader: Story = {
  render: () => (
    <div style={{ maxInlineSize: '22rem' }}>
      <ki-top-nav size="sm">
        <a slot="brand" href="#home">
          Kimen
        </a>
        <a href="#overview">Overview</a>
        <a href="#projects" aria-current="page">
          Projects
        </a>
      </ki-top-nav>
    </div>
  ),
};

export const WrappingHeader: Story = {
  render: () => (
    <div style={{ maxInlineSize: '22rem' }}>
      <ki-top-nav label="Documentation" collapseAt="none">
        <a slot="brand" href="#home">
          Kimen Design System
        </a>
        <a href="#guide" aria-current="page">
          Guide
        </a>
        <a href="#components">Components</a>
        <a href="#tokens">Tokens</a>
        <a href="#changelog">Changelog</a>
        <ki-icon-button slot="actions" label="Search" variant="ghost">
          <ki-icon name="search" />
        </ki-icon-button>
      </ki-top-nav>
    </div>
  ),
};

export const AlignedHeader: Story = {
  args: { collapseAt: 'none', label: 'Documentation' },
  render: (args) => (
    <ki-top-nav
      {...args}
      style={{
        '--ki-top-nav-links-gap': 'var(--ki-layout-spacing-xs)',
        '--ki-top-nav-links-justify': 'flex-end',
      }}
    >
      <a slot="brand" href="#home">
        Kimen
      </a>
      <a href="#guide" aria-current="page">
        Guide
      </a>
      <a href="#components">Components</a>
      <ki-icon-button slot="actions" label="Search" variant="ghost">
        <ki-icon name="search" />
      </ki-icon-button>
    </ki-top-nav>
  ),
};

export const CollapsingAppBar: Story = {
  args: {
    variant: 'app-bar',
    size: 'lg',
    screenTitle: 'Release notes',
    subtitle: 'Version 2.4',
    scrollBehavior: 'collapse',
    sticky: true,
  },
  render: (args) => (
    <div style={{ blockSize: '18rem', overflow: 'auto' }}>
      <ki-top-nav {...args}>
        <ki-icon-button slot="leading" variant="ghost" label="Back">
          <ki-icon name="arrow-left" />
        </ki-icon-button>
        <ki-icon-button slot="actions" variant="ghost" label="Share">
          <ki-icon name="share-2" />
        </ki-icon-button>
        <ki-icon-button slot="actions" variant="ghost" label="Edit">
          <ki-icon name="pencil" />
        </ki-icon-button>
        <ki-icon-button slot="actions" variant="ghost" label="Star">
          <ki-icon name="star" />
        </ki-icon-button>
        <ki-icon-button slot="actions" variant="ghost" label="Archive">
          <ki-icon name="archive" />
        </ki-icon-button>
      </ki-top-nav>
      <section style={{ minBlockSize: '32rem', padding: 'var(--ki-layout-spacing-3xl)' }}>
        Scroll this panel to collapse the heading row.
      </section>
    </div>
  ),
};

export const CenteredTitle: Story = {
  render: () => (
    <div style={{ maxInlineSize: '25rem' }}>
      <ki-top-nav variant="app-bar" size="sm" title-align="center" screenTitle="Inbox">
        <ki-icon-button slot="leading" variant="ghost" label="Back">
          <ki-icon name="arrow-left" />
        </ki-icon-button>
        <ki-icon-button slot="actions" variant="ghost" label="Search">
          <ki-icon name="search" />
        </ki-icon-button>
      </ki-top-nav>
    </div>
  ),
};

export const SearchAppBar: Story = {
  render: () => (
    <ki-top-nav variant="app-bar" screenTitle="Project search">
      <ki-icon-button slot="leading" variant="ghost" label="Back">
        <ki-icon name="arrow-left" />
      </ki-icon-button>
      <input slot="search" type="search" aria-label="Search projects" />
    </ki-top-nav>
  ),
};
