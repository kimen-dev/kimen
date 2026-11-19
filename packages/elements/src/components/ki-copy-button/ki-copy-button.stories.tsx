import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiCopyButton } from './ki-copy-button';

type Args = Pick<KiCopyButton, 'label'>;

const meta = {
  title: 'Elements/ki-copy-button',
  component: 'ki-copy-button',
  args: { label: 'Example' },
} satisfies Meta<Args>;

export default meta;

// TODO(spec): show the component's supported example states.
export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-copy-button', args),
};
