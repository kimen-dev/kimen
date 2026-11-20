import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiReasoning } from './ki-reasoning';

type Args = Pick<KiReasoning, 'status' | 'duration' | 'open'>;

const meta = {
  title: 'Elements/ki-reasoning',
  component: 'ki-reasoning',
  args: { status: 'thinking', open: false },
  argTypes: {
    status: { control: 'radio', options: ['thinking', 'done'] },
    duration: { control: { type: 'number', min: 0, step: 1000 } },
  },
} satisfies Meta<Args>;

export default meta;

const renderPlan = (args: Args) =>
  h(
    'ki-reasoning',
    args,
    h('ol', null, h('li', null, 'Check the inputs.'), h('li', null, 'Compare the outcomes.')),
  );

export const Playground: StoryObj<Args> = {
  render: renderPlan,
};

export const Thinking: StoryObj<Args> = {
  args: { open: true },
  render: renderPlan,
};

export const Completed: StoryObj<Args> = {
  args: { status: 'done', duration: 12000 },
  render: renderPlan,
};
