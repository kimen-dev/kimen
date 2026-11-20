import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSegment } from './ki-segment';

type Args = Pick<KiSegment, 'value' | 'accessibleLabel' | 'disabled'>;

const meta = {
  title: 'Elements/ki-segment',
  component: 'ki-segment',
  args: { value: 'board', accessibleLabel: 'Board', disabled: false },
} satisfies Meta<Args>;

export default meta;

export const IconOnly: StoryObj<Args> = {
  render: (args) =>
    h(
      'ki-segmented-control',
      { label: 'View', size: 'sm' },
      h('ki-segment', { value: 'list' }, 'List'),
      h(
        'ki-segment',
        args,
        h(
          'svg',
          { slot: 'start', viewBox: '0 0 16 16', 'aria-hidden': 'true' },
          h('path', { d: 'M2 2h4v12H2zm6 0h6v7H8z', fill: 'currentColor' }),
        ),
      ),
    ),
};
