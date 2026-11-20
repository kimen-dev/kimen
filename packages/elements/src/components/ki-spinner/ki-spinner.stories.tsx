import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSpinner } from './ki-spinner';

type Args = Pick<KiSpinner, 'label' | 'showLabel' | 'size' | 'variant'>;

const meta = {
  title: 'Elements/ki-spinner',
  component: 'ki-spinner',
  args: { label: 'Saving changes', showLabel: false, size: 'md', variant: 'ring' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'radio', options: ['ring', 'dots'] },
  },
} satisfies Meta<Args>;

export default meta;

export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-spinner', args),
};

export const RingSizes: StoryObj<Args> = {
  render: () =>
    h(
      'div',
      { style: { display: 'grid', gap: 'var(--ki-space-md)', justifyItems: 'start' } },
      h('ki-spinner', { size: 'sm', label: 'Saving changes', showLabel: true }),
      h('ki-spinner', { size: 'md', label: 'Running a tool', showLabel: true }),
      h('ki-spinner', { size: 'lg', label: 'Connecting', showLabel: true }),
    ),
};

export const TypingDots: StoryObj<Args> = {
  args: { label: 'Assistant is thinking', showLabel: true, variant: 'dots' },
  render: (args) => h('ki-spinner', args),
};
