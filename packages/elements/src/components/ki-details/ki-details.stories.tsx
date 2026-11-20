import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { KiDetails } from './ki-details';

type Args = Pick<KiDetails, 'summary' | 'open' | 'disabled'>;

const meta = {
  title: 'Elements/ki-details',
  component: 'ki-details',
  args: {
    summary: 'Who can see my workspace?',
    open: false,
    disabled: false,
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => h('ki-details', args, 'Only the people you invite can see it.'),
};

export const RichSummary: Story = {
  render: () =>
    h(
      'ki-details',
      { open: true },
      h('h2', { slot: 'summary', style: { margin: '0' } }, 'Workspace settings'),
      'Choose who can invite members and manage workspace data.',
    ),
};

export const Disabled: Story = {
  args: { open: true, disabled: true },
  render: (args) => h('ki-details', args, 'Only the people you invite can see it.'),
};
