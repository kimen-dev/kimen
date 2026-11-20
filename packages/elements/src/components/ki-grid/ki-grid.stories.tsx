import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiGrid } from './ki-grid';

type Args = Pick<KiGrid, 'columns' | 'gap' | 'minColumn'>;

const meta = {
  title: 'Elements/ki-grid',
  component: 'ki-grid',
  args: { minColumn: '15rem', gap: 'xl' },
} satisfies Meta<Args>;

export default meta;

export const Automatic: StoryObj<Args> = {
  args: { minColumn: '8rem' },
  render: (args) =>
    h('ki-grid', args, [
      h('div', { 'data-span': '2' }, 'Overview'),
      h('div', null, 'Orders'),
      h('div', null, 'Inventory'),
      h('div', null, 'Customers'),
    ]),
};

export const Fixed: StoryObj<Args> = {
  ...Automatic,
  args: { columns: 3, gap: 'sm' },
};
