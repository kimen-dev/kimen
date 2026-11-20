import '../../../icons/refresh-cw.js';
import '../../../icons/thumbs-down.js';
import '../../../icons/thumbs-up.js';

import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiMessage } from './ki-message';

type Args = Pick<KiMessage, 'author' | 'iconName' | 'messageRole' | 'streaming'>;

const meta = {
  title: 'Elements/ki-message',
  component: 'ki-message',
  args: { messageRole: 'assistant', streaming: false },
  argTypes: {
    messageRole: { control: 'radio', options: ['user', 'assistant', 'event'] },
  },
} satisfies Meta<Args>;

export default meta;

export const Playground: StoryObj<Args> = {
  render: (args) => h('ki-message', args, 'The input and textarea show field errors.'),
};

export const CustomAvatarAndActions: StoryObj<Args> = {
  args: { author: 'Ava said' },
  render: (args) =>
    h(
      'ki-message',
      args,
      h('ki-avatar', { slot: 'avatar', size: 'xs', initials: 'AV' }),
      h('strong', null, 'Start here.'),
      ' The input and textarea show field errors.',
      h(
        'details',
        { slot: 'actions' },
        h('summary', null, 'View source'),
        'Input and textarea component guides',
      ),
    ),
};

export const RightToLeft: StoryObj<Args> = {
  render: (args) =>
    h(
      'ki-conversation',
      { dir: 'rtl', label: 'Export help' },
      h('ki-message', { messageRole: 'user' }, 'Which format?'),
      h('ki-message', args, 'Choose the ', h('code', null, 'JSON'), ' option.'),
    ),
};

export const ReplyActions: StoryObj<Args> = {
  render: (args) =>
    h(
      'ki-message',
      {
        ...args,
        actionsLabel: 'Reply actions',
        feedback: 'good',
        branchIndex: 2,
        branchCount: 3,
        'onKi-branch-change': (event: CustomEvent<{ index: number }>) => {
          const message = event.currentTarget as HTMLElement &
            Pick<KiMessage, 'branchIndex' | 'feedback'>;
          const replies = [
            'Use the export menu.',
            'Choose JSON.',
            'Save the copy with your project.',
          ];
          const reply = message.querySelector('span');
          if (reply) reply.textContent = replies[event.detail.index - 1] ?? '';
          message.branchIndex = event.detail.index;
          if (event.detail.index === 2) message.feedback = 'good';
          else message.removeAttribute('feedback');
        },
      },
      h('span', null, 'Choose JSON.'),
      h(
        'ki-icon-button',
        {
          slot: 'actions',
          size: 'sm',
          variant: 'ghost',
          label: 'Regenerate',
          'data-message-action': 'regenerate',
        },
        h('ki-icon', { name: 'refresh-cw' }),
      ),
      h(
        'ki-icon-button',
        {
          slot: 'actions',
          size: 'sm',
          variant: 'ghost',
          label: 'Good response',
          'data-message-action': 'good',
        },
        h('ki-icon', { name: 'thumbs-up' }),
      ),
      h(
        'ki-icon-button',
        {
          slot: 'actions',
          size: 'sm',
          variant: 'ghost',
          label: 'Bad response',
          'data-message-action': 'bad',
        },
        h('ki-icon', { name: 'thumbs-down' }),
      ),
    ),
};
