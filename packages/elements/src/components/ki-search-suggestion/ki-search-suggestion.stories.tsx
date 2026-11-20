import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-search-suggestion',
  component: 'ki-search-suggestion',
  args: { value: 'ki-dialog', description: 'Component' },
} satisfies Meta<JSX.KiSearchSuggestion>;

export default meta;

export const Playground: StoryObj<JSX.KiSearchSuggestion> = {
  render: (args) => (
    <ki-search mode="docked" label="Search components" value="dia">
      <ki-search-suggestion {...args}>ki-dialog</ki-search-suggestion>
      <ki-search-suggestion recent>button tokens</ki-search-suggestion>
    </ki-search>
  ),
};
