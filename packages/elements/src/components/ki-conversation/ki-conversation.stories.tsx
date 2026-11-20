import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiConversation } from './ki-conversation';

type Args = Pick<KiConversation, 'label' | 'stickToBottom' | 'jumpLabel'>;

const meta = {
  title: 'Elements/ki-conversation',
  component: 'ki-conversation',
  args: { label: 'Component help', stickToBottom: false, jumpLabel: 'Jump to latest' },
} satisfies Meta<Args>;

export default meta;

const conversationStyle = { inlineSize: 'min(100%, 36rem)' };

export const Playground: StoryObj<Args> = {
  render: (args) =>
    h(
      'ki-conversation',
      { ...args, style: conversationStyle },
      h('ki-message', { messageRole: 'user' }, 'Which inputs handle form errors?'),
      h('ki-message', { messageRole: 'event', iconName: 'search' }, 'Searched the component docs'),
      h(
        'ki-message',
        { messageRole: 'assistant' },
        'Input, textarea and select show field errors.',
      ),
      h('ki-message', { messageRole: 'user' }, 'And the switch?'),
      h('ki-message', { streaming: true }, 'The switch applies its setting immediately'),
    ),
};

const history = [
  'The first release added forms.',
  'The next release added navigation.',
  'The third release introduced the icon set.',
  'The fourth release added page layouts.',
  'The latest release adds conversation views.',
];

export const FollowLatest: StoryObj<Args> = {
  args: { label: 'Release history', stickToBottom: true },
  render: (args) => {
    let conversation: HTMLElement | undefined;

    const addReply = () => {
      if (!conversation) return;
      const reply = document.createElement('ki-message');
      const index = conversation.childElementCount - history.length + 1;
      reply.textContent = `New reply ${String(index)} from the assistant.`;
      conversation.append(reply);
    };

    return h(
      'div',
      { style: { display: 'grid', gap: 'var(--ki-conversation-gap)', ...conversationStyle } },
      h(
        'ki-conversation',
        {
          ...args,
          ref: (element?: HTMLElement) => {
            conversation = element;
          },
          style: { blockSize: '9rem' },
        },
        ...history.map((reply) => h('ki-message', null, reply)),
      ),
      h('ki-button', { onClick: addReply, type: 'button', variant: 'secondary' }, 'Add a reply'),
    );
  },
};
