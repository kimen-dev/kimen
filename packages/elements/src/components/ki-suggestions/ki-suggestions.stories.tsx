import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSuggestions } from './ki-suggestions';

type Args = Pick<KiSuggestions, 'label'>;

const meta = {
  title: 'Elements/ki-suggestions',
  component: 'ki-suggestions',
  args: { label: 'Example' },
} satisfies Meta<Args>;

export default meta;

// TODO(spec): show the component's supported example states.
export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-suggestions', args),
};
