import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSuggestions } from './ki-suggestions';

type Args = Pick<KiSuggestions, 'label' | 'variant' | 'mode'>;

const meta = {
  title: 'Elements/ki-suggestions',
  component: 'ki-suggestions',
  args: { label: 'Follow-up suggestions', variant: 'chips', mode: 'send' },
  argTypes: {
    variant: { control: 'select', options: ['chips', 'cards'] },
    mode: { control: 'select', options: ['send', 'fill'] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const FollowUps: Story = {
  render: (args) =>
    h(
      'ki-suggestions',
      args,
      h('ki-suggestion', {}, 'Which ones recur?'),
      h('ki-suggestion', {}, 'Group them by service'),
      h('ki-suggestion', {}, 'Turn this into a table'),
    ),
};

export const FillComposer: Story = {
  args: { label: 'Start a conversation', variant: 'cards', mode: 'fill' },
  render: (args) => (
    <div>
      {h(
        'ki-suggestions',
        args,
        h('ki-suggestion', { description: 'From the on-call reports' }, 'Summarise the incidents'),
        h('ki-suggestion', { description: 'For the merged pull requests' }, 'Draft release notes'),
      )}
      <p>
        <label>
          Message
          <br />
          <textarea rows={3} />
        </label>
      </p>
    </div>
  ),
  play: ({ canvasElement }) => {
    const suggestions = canvasElement.querySelector<HTMLElement & Pick<KiSuggestions, 'composer'>>(
      'ki-suggestions',
    );
    const composer = canvasElement.querySelector('textarea');
    if (suggestions && composer) {
      suggestions.composer = composer;
    }
  },
};

export const RightToLeft: Story = {
  ...FollowUps,
  decorators: [(story) => <div dir="rtl">{story()}</div>],
};
