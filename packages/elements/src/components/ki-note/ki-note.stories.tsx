import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiNote } from './ki-note';

type Args = Pick<KiNote, 'tone' | 'size' | 'icon'>;

const meta = {
  title: 'Elements/ki-note',
  component: 'ki-note',
  args: { tone: 'neutral', size: 'md', icon: true },
  parameters: { slots: { default: 'Only workspace owners can change billing details.' } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

const toneExamples = {
  neutral: 'Only workspace owners can change billing details.',
  primary: 'You can add a recovery contact in workspace settings.',
  info: 'This link is visible to everyone in the workspace.',
  success: 'Your domain is verified.',
  warning: 'Changing the slug breaks existing links.',
  danger: 'Deleting a project removes its data for everyone.',
} as const;

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-md)', maxInlineSize: '30rem' }}>
      {Object.entries(toneExamples).map(([tone, text]) => h('ki-note', { ...args, tone }, text))}
    </div>
  ),
};

export const Small: Story = {
  args: { size: 'sm', tone: 'warning' },
  render: (args) => h('ki-note', args, toneExamples.warning),
};

export const WithoutIcon: Story = {
  args: { icon: false, size: 'sm' },
};

export const CustomIcon: Story = {
  render: (args) =>
    h(
      'ki-note',
      { ...args, tone: 'info' },
      h(
        'svg',
        {
          slot: 'icon',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 2,
        },
        h('path', { d: 'M12 3v18M3 12h18' }),
      ),
      'Adding a billing contact gives them access to invoices.',
    ),
};

export const RightToLeft: Story = {
  render: (args) =>
    h(
      'ki-note',
      { ...args, dir: 'rtl', lang: 'ar', tone: 'warning' },
      'يؤدي حذف هذا المشروع إلى إزالة بياناته للجميع.',
    ),
};
