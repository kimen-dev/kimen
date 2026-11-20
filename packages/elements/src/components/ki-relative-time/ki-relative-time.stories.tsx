import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiRelativeTime } from './ki-relative-time';

type Args = Pick<KiRelativeTime, 'date' | 'numeric' | 'sync' | 'threshold'>;

const meta = {
  title: 'Elements/ki-relative-time',
  component: 'ki-relative-time',
  args: { date: new Date(Date.now() - 9_000_000).toISOString(), numeric: 'auto' },
} satisfies Meta<Args>;

export default meta;

export const Recent: StoryObj<Args> = {
  render: (args) => h('ki-relative-time', args),
};

export const Synchronized: StoryObj<Args> = {
  ...Recent,
  render: (args) =>
    h('ki-relative-time', {
      ...args,
      date: new Date(Date.now() - 10_000).toISOString(),
      sync: true,
      threshold: 60,
    }),
};

export const Absolute: StoryObj<Args> = {
  ...Recent,
  args: { date: '2026-11-19T08:41:00Z', threshold: 0 },
};
