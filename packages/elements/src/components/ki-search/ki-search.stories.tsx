import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-search',
  component: 'ki-search',
  args: { label: 'Search Kimen', placeholder: 'Search Kimen', mode: 'docked' },
} satisfies Meta<JSX.KiSearch>;

export default meta;
type Story = StoryObj<JSX.KiSearch>;

function renderSearch(args: JSX.KiSearch) {
  return (
    <ki-search {...args}>
      <ki-search-suggestion value="ki-dialog" description="Component">
        ki-dialog
      </ki-search-suggestion>
      <ki-search-suggestion value="modal-dialogs" description="Guide">
        Modal dialogs
      </ki-search-suggestion>
      <ki-search-suggestion recent>button tokens</ki-search-suggestion>
      <p slot="results">Dialog accessibility guide</p>
    </ki-search>
  );
}

export const Playground: Story = { render: renderSearch };

export const FullScreen: Story = {
  args: { mode: 'fullscreen' },
  render: renderSearch,
};

export const Loading: Story = {
  args: { loading: true },
  render: renderSearch,
};
