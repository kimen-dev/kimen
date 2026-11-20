import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiMarkdown } from './ki-markdown';

type Args = Pick<KiMarkdown, 'label'>;

const meta = {
  title: 'Elements/ki-markdown',
  component: 'ki-markdown',
  args: { label: 'Example' },
} satisfies Meta<Args>;

export default meta;

// TODO(spec): show the component's supported example states.
export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-markdown', args),
};
