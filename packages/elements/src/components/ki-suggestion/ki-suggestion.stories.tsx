import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSuggestion } from './ki-suggestion';

type Args = Pick<KiSuggestion, 'label'>;

const meta = {
  title: 'Elements/ki-suggestion',
  component: 'ki-suggestion',
  args: { label: 'Example' },
} satisfies Meta<Args>;

export default meta;

// TODO(spec): show the component's supported example states.
export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-suggestion', args),
};
