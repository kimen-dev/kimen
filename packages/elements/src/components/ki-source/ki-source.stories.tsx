import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-source',
  component: 'ki-source',
  args: {
    sourceId: 'source-demo',
    href: 'https://example.org/methods',
    sourceTitle: 'Study design',
    snippet: 'How the study ran.',
  },
} satisfies Meta<JSX.KiSource>;

export default meta;
type Story = StoryObj<JSX.KiSource>;

export const Playground: Story = {
  render: (args) => (
    <ki-sources open>
      <ki-source {...args} />
    </ki-sources>
  ),
};
