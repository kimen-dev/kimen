import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiStep } from './ki-step';

type Args = Pick<KiStep, 'state' | 'href' | 'description'>;

const meta = {
  title: 'Elements/ki-step',
  component: 'ki-step',
  args: { state: 'current', description: 'Confirm the billing address.' },
  argTypes: { state: { control: 'radio', options: ['done', 'current', 'upcoming', 'error'] } },
} satisfies Meta<Args>;

export default meta;

export const InStepper: StoryObj<Args> = {
  render: (args) =>
    h(
      'ki-stepper',
      { label: 'Checkout progress', orientation: 'vertical' },
      h('ki-step', args, 'Billing'),
    ),
};
