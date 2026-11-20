import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiMobileNav } from './ki-mobile-nav';

type Args = Pick<KiMobileNav, 'label'>;

const meta = {
  title: 'Elements/ki-mobile-nav',
  component: 'ki-mobile-nav',
  args: { label: 'Example' },
} satisfies Meta<Args>;

export default meta;

// TODO(spec): show the component's supported example states.
export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-mobile-nav', args),
};
