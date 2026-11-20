import '../../../icons/archive.js';
import '../../../icons/bold.js';
import '../../../icons/italic.js';
import '../../../icons/link.js';
import '../../../icons/mail.js';
import '../../../icons/reply.js';
import '../../../icons/zoom-in.js';
import '../../../icons/zoom-out.js';

import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiToolbar } from './ki-toolbar';

type Args = Pick<KiToolbar, 'label' | 'variant' | 'orientation' | 'tone' | 'hideOnScroll'>;

const meta = {
  title: 'Elements/ki-toolbar',
  component: 'ki-toolbar',
  args: {
    label: 'Formatting',
    variant: 'floating',
    orientation: 'horizontal',
    tone: 'standard',
    hideOnScroll: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['floating', 'docked'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    tone: { control: 'select', options: ['standard', 'vibrant'] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

function iconAction(label: string, name: string) {
  return h('ki-icon-button', { label, variant: 'ghost', size: 'sm' }, h('ki-icon', { name }));
}

export const Playground: Story = {
  render: (args) =>
    h(
      'ki-toolbar',
      args,
      iconAction('Bold', 'bold'),
      iconAction('Italic', 'italic'),
      h('ki-divider', {
        orientation:
          args.orientation === 'vertical' && args.variant === 'floating'
            ? 'horizontal'
            : 'vertical',
      }),
      iconAction('Insert link', 'link'),
    ),
};

export const Vertical: Story = {
  args: { label: 'Zoom', orientation: 'vertical' },
  render: (args) =>
    h('ki-toolbar', args, iconAction('Zoom in', 'zoom-in'), iconAction('Zoom out', 'zoom-out')),
};

export const FloatingWithCompanion: Story = {
  args: { label: 'Message actions', tone: 'vibrant' },
  render: (args) =>
    h(
      'ki-toolbar',
      args,
      iconAction('Archive', 'archive'),
      iconAction('Mark unread', 'mail'),
      h(
        'ki-button',
        { slot: 'fab', variant: 'primary' },
        h('ki-icon', { slot: 'start', name: 'reply' }),
        'Reply',
      ),
    ),
};

export const Docked: Story = {
  args: { label: 'Message actions', variant: 'docked', tone: 'vibrant' },
  render: (args) =>
    h(
      'div',
      {
        style: {
          transform: 'translateZ(0)',
          minBlockSize: 'var(--ki-layout-spacing-18xl)',
        },
      },
      h(
        'ki-toolbar',
        args,
        iconAction('Archive', 'archive'),
        iconAction('Mark unread', 'mail'),
        iconAction('Reply', 'reply'),
      ),
    ),
};
