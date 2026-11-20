import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { KiAccordion } from './ki-accordion';

type Args = Pick<KiAccordion, 'exclusive'>;

const meta = {
  title: 'Elements/ki-accordion',
  component: 'ki-accordion',
  args: { exclusive: true },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) =>
    h(
      'ki-accordion',
      args,
      h(
        'ki-details',
        { summary: 'Who can see my workspace?', open: true },
        'Only the people you invite can see it.',
      ),
      h(
        'ki-details',
        { summary: 'Can I export my data?' },
        'Open Settings, then select Data and Export.',
      ),
      h(
        'ki-details',
        { summary: 'How do I close my account?' },
        'Find the account closure option in Settings.',
      ),
    ),
};
