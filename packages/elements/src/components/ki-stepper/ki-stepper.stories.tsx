import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiStepper } from './ki-stepper';

type Args = Pick<KiStepper, 'label' | 'orientation'>;

const meta = {
  title: 'Elements/ki-stepper',
  component: 'ki-stepper',
  args: { label: 'Setup progress', orientation: 'horizontal' },
  argTypes: { orientation: { control: 'radio', options: ['horizontal', 'vertical'] } },
} satisfies Meta<Args>;

export default meta;

function setupSteps(args: Args) {
  return h(
    'ki-stepper',
    args,
    h('ki-step', { state: 'done', href: '#account' }, 'Account'),
    h('ki-step', { state: 'done' }, 'Workspace'),
    h('ki-step', { state: 'current' }, 'Invite team'),
    h('ki-step', {}, 'Review'),
  );
}

export const Horizontal: StoryObj<Args> = { render: setupSteps };

export const Compact: StoryObj<Args> = {
  render: (args) => h('div', { style: { maxInlineSize: '18rem' } }, setupSteps(args)),
};

export const Vertical: StoryObj<Args> = {
  args: { orientation: 'vertical' },
  render: (args) =>
    h(
      'ki-stepper',
      args,
      h('ki-step', { state: 'done', href: '#account' }, 'Account'),
      h('ki-step', { state: 'current' }, 'Invite team'),
      h(
        'ki-step',
        { state: 'error', description: 'Check the repository permissions.' },
        'Run checks',
      ),
      h('ki-step', { description: 'Publish when the checks pass.' }, 'Publish'),
    ),
};
