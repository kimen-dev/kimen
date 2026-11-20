import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiStack } from './ki-stack';

type Args = Pick<KiStack, 'direction' | 'gap' | 'justify' | 'align' | 'wrap'>;

const meta = {
  title: 'Elements/ki-stack',
  component: 'ki-stack',
  args: { direction: 'column', gap: 'md', justify: 'start', align: 'stretch', wrap: false },
} satisfies Meta<Args>;

export default meta;

export const Playground: StoryObj<Args> = {
  render: (args) =>
    h('ki-stack', args, [
      h('div', { 'data-grow': '' }, 'Order summary'),
      h('button', { type: 'button' }, 'Cancel'),
      h('button', { type: 'button' }, 'Save'),
    ]),
};

export const Toolbar: StoryObj<Args> = {
  ...Playground,
  args: { direction: 'row', align: 'center', justify: 'between', wrap: true },
};
