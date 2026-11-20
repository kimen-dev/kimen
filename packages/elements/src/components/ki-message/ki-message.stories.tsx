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
      h('span', { slot: 'avatar', 'aria-hidden': 'true' }, 'AV'),
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
