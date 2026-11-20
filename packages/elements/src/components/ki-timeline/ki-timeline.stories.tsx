import '../../../icons/circle-alert.js';
import '../../../icons/circle-check.js';
import '../../../icons/git-merge.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiTimeline } from './ki-timeline';

type Args = Pick<KiTimeline, 'label' | 'order'>;

const meta = {
  title: 'Elements/ki-timeline',
  component: 'ki-timeline',
  args: { label: 'Deployment activity', order: 'newest-first' },
  argTypes: {
    order: { control: 'select', options: ['newest-first', 'oldest-first'] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => (
    <ki-timeline {...args}>
      <ki-timeline-item iconName="git-merge" tone="primary" datetime="2024-11-19T10:41:00Z">
        <strong>Luis Perez</strong> merged <code>fix/search-index</code>
      </ki-timeline-item>
      <ki-timeline-item iconName="circle-check" tone="success" datetime="2024-11-19T10:38:00Z">
        Verification passed
      </ki-timeline-item>
      <ki-timeline-item
        iconName="circle-alert"
        tone="danger"
        datetime="2024-11-19T10:20:00Z"
        detailsLabel="Build log"
      >
        Preview deploy failed
        <div slot="details">The runner timed out while compiling the web app.</div>
      </ki-timeline-item>
    </ki-timeline>
  ),
};

export const OldestFirst: Story = {
  ...Playground,
  args: { order: 'oldest-first' },
};

export const RightToLeft: Story = {
  ...Playground,
  decorators: [(story) => <div dir="rtl">{story()}</div>],
};
