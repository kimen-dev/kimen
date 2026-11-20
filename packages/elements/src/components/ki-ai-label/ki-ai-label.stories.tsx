import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiAiLabel } from './ki-ai-label';

type Args = Pick<
  KiAiLabel,
  'explanation' | 'generatedAt' | 'label' | 'model' | 'revertible' | 'size'
>;

const meta = {
  title: 'Elements/ki-ai-label',
  component: 'ki-ai-label',
  args: { label: 'AI', revertible: false, size: 'sm' },
  argTypes: {
    size: { control: 'radio', options: ['sm', 'md'] },
  },
} satisfies Meta<Args>;

export default meta;

export const Static: StoryObj<Args> = {
  render: (args) => h('ki-ai-label', args),
};

export const Provenance: StoryObj<Args> = {
  args: {
    explanation: 'Written from the incident reports of the last 30 days.',
    generatedAt: '2026-11-19T10:32',
    model: 'Standard',
  },
  render: (args) => h('ki-ai-label', args),
};

export const SuggestedField: StoryObj<Args> = {
  render: () => {
    const original = 'Weekly summary';
    return h(
      'ki-input',
      { label: 'Subject', value: 'Incident summary' },
      h('ki-ai-label', {
        slot: 'end',
        explanation: 'Suggested from the incident reports of the last 30 days.',
        revertible: true,
        'onKi-revert': (event: Event) => {
          const label = event.currentTarget as HTMLElement;
          const field = label.closest('ki-input');
          if (field) {
            field.value = original;
            label.remove();
            field.focus();
          }
        },
      }),
    );
  },
};
