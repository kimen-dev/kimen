import '../../../icons/circle-alert.js';
import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiTimelineItem } from './ki-timeline-item';

type Args = Pick<KiTimelineItem, 'datetime' | 'iconName' | 'tone' | 'detailsLabel'>;

const meta = {
  title: 'Elements/ki-timeline-item',
  component: 'ki-timeline-item',
  args: {
    datetime: '2024-11-19T10:20:00Z',
    iconName: 'circle-alert',
    tone: 'danger',
    detailsLabel: 'Build log',
  },
  argTypes: {
    iconName: { control: 'select', options: ['', 'circle-alert'] },
    tone: { control: 'select', options: ['neutral', 'primary', 'success', 'warning', 'danger'] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) => (
    <ki-timeline label="Deployment activity">
      <ki-timeline-item {...args}>
        Preview deploy failed
        <div slot="details">The runner timed out while compiling the web app.</div>
      </ki-timeline-item>
    </ki-timeline>
  ),
};

export const WithAvatar: Story = {
  args: { datetime: '2024-11-19', iconName: '', tone: 'neutral' },
  render: (args) => (
    <ki-timeline label="Order updates">
      <ki-timeline-item {...args}>
        <ki-avatar slot="start" size="xs" initials="ML" />
        <strong>Mina Lee</strong> packed the order
      </ki-timeline-item>
    </ki-timeline>
  ),
};
