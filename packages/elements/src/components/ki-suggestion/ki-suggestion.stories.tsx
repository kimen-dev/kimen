import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSuggestion } from './ki-suggestion';

type Args = Pick<KiSuggestion, 'description'>;

const meta = {
  title: 'Elements/ki-suggestion',
  component: 'ki-suggestion',
  args: { description: 'For the merged pull requests' },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const DescribedCard: Story = {
  render: (args) =>
    h(
      'ki-suggestions',
      { label: 'Start a conversation', variant: 'cards' },
      h('ki-suggestion', args, 'Draft release notes'),
    ),
};

export const TitleOnly: Story = {
  ...DescribedCard,
  args: { description: '' },
};
