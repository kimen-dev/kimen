import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiMobileNavItem } from './ki-mobile-nav-item';

type Args = Pick<KiMobileNavItem, 'label'>;

const meta = {
  title: 'Elements/ki-mobile-nav-item',
  component: 'ki-mobile-nav-item',
  args: { label: 'Example' },
} satisfies Meta<Args>;

export default meta;

// TODO(spec): show the component's supported example states.
export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-mobile-nav-item', args),
};
