import '../../../icons/folder-plus.js';
import '../../../icons/search-x.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { KiEmptyState } from './ki-empty-state.js';

type Args = Pick<
  KiEmptyState,
  'announce' | 'heading' | 'headingLevel' | 'iconName' | 'size' | 'tone'
>;

const meta = {
  title: 'Elements/ki-empty-state',
  component: 'ki-empty-state',
  args: { heading: 'No projects yet', iconName: 'folder-plus', tone: 'primary-light', size: 'md' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] },
    headingLevel: { control: { type: 'number', min: 2, max: 6, step: 1 } },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const FirstRun: Story = {
  render: (args) =>
    h(
      'ki-empty-state',
      args,
      'Projects hold your surfaces, catalogs and themes.',
      h('ki-button', { slot: 'actions', variant: 'secondary' }, 'Browse templates'),
      h('ki-button', { slot: 'actions', variant: 'primary' }, 'New project'),
    ),
};

export const NoResults: Story = {
  args: {
    heading: 'No results for “webhok”',
    iconName: 'search-x',
    tone: 'neutral',
    size: 'sm',
    announce: true,
  },
  render: (args) =>
    h(
      'ki-empty-state',
      args,
      'Check the spelling or remove a filter.',
      h('ki-button', { slot: 'actions', variant: 'secondary' }, 'Clear filters'),
    ),
};
