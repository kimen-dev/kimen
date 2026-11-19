import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSegmentedControl } from './ki-segmented-control';

type Args = Pick<KiSegmentedControl, 'label' | 'value' | 'size' | 'fullWidth'>;

const meta = {
  title: 'Elements/ki-segmented-control',
  component: 'ki-segmented-control',
  args: { label: 'Range', value: 'week', size: 'md', fullWidth: false },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md'] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) =>
    h(
      'ki-segmented-control',
      args,
      h('ki-segment', { value: 'day' }, 'Day'),
      h('ki-segment', { value: 'week' }, 'Week'),
      h('ki-segment', { value: 'month' }, 'Month'),
      h('ki-segment', { value: 'year', disabled: true }, 'Year'),
    ),
};

export const EqualWidth: Story = {
  ...Playground,
  args: { fullWidth: true, size: 'sm' },
};

export const RightToLeft: Story = {
  ...Playground,
  decorators: [(story) => <div dir="rtl">{story()}</div>],
};
