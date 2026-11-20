import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiLink } from './ki-link';

type LinkProps = Omit<KiLink, 'render'>;

const meta = {
  title: 'Elements/ki-link',
  component: 'ki-link',
  parameters: {
    layout: 'centered',
    slots: { default: 'Read the catalog contract' },
  },
  args: {
    href: '#catalog',
    variant: 'primary',
    underline: 'always',
    external: false,
  },
} satisfies Meta<LinkProps>;

export default meta;

type Story = StoryObj<LinkProps>;

export const Playground: Story = {};

export const RunningText: Story = {
  render: () => (
    <p>
      Read the {h('ki-link', { href: '#catalog' }, 'catalog contract')}, or browse{' '}
      {h(
        'ki-link',
        { href: 'https://github.com/kimen-dev/kimen', external: true },
        'the source on GitHub',
      )}
      .
    </p>
  ),
};

export const Standalone: Story = {
  render: () => (
    <nav aria-label="Resources">
      {h('ki-link', { href: '#catalog', underline: 'hover' }, 'Documentation')}
      {' · '}
      {h('ki-link', { href: '#changelog', variant: 'neutral', underline: 'hover' }, 'Changelog')}
    </nav>
  ),
};
