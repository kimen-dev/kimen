import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import { validationExample } from './gallery';
import type { KiMarkdown } from './ki-markdown';

type Args = Pick<KiMarkdown, 'allowImages' | 'headingOffset' | 'srcText' | 'streaming'>;

const meta = {
  title: 'Elements/ki-markdown',
  component: 'ki-markdown',
  args: { srcText: validationExample },
  render: (args) => <ki-markdown {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const FormattedAnswer: Story = {};

export const PartialAnswer: Story = {
  args: {
    streaming: true,
    srcText: '## Read the field\n\n```ts\nconst invalid = !field.value;',
  },
};

export const RightToLeft: Story = {
  args: { srcText: '> Place the error beside the field.' },
  render: (args) => <ki-markdown {...args} dir="rtl" />,
};
