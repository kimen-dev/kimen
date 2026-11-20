import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-pagination',
  component: 'ki-pagination',
  args: { page: 5, pages: 12, siblings: 1, boundaries: 1 },
} satisfies Meta<JSX.KiPagination>;

export default meta;
type Story = StoryObj<JSX.KiPagination>;

export const Playground = {
  render: (args) => (
    <ki-pagination
      {...args}
      onKi-page-change={(event) => {
        const pager = event.currentTarget as HTMLKiPaginationElement;
        pager.page = event.detail.page;
      }}
    />
  ),
} satisfies Story;

export const Compact: Story = {
  args: { variant: 'compact' },
  render: Playground.render,
};

export const ServerLinks: Story = {
  args: { hrefTemplate: '#results-page-{page}' },
  render: (args) => <ki-pagination {...args} />,
};

export const LoadMore: Story = {
  render: () => (
    <ki-pagination
      variant="load-more"
      shown={20}
      total={60}
      onKi-load-more={(event) => {
        const pager = event.currentTarget as HTMLKiPaginationElement;
        pager.shown = (pager.shown ?? 0) + 20;
      }}
    />
  ),
};
