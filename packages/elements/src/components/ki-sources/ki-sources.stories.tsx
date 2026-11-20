import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-sources',
  component: 'ki-sources',
  args: { open: false },
} satisfies Meta<JSX.KiSources>;

export default meta;
type Story = StoryObj<JSX.KiSources>;

export const Playground: Story = {
  render: (args) => (
    <div>
      <p>
        The study design
        <ki-citation citationRef="story-methods" /> explains the results
        <ki-citation citationRef="story-results" />.
      </p>
      <ki-sources {...args}>
        <ki-source id="story-results" href="https://example.net/findings" sourceTitle="Findings" />
        <ki-source
          id="story-methods"
          href="https://example.org/methods"
          sourceTitle="Study design"
          snippet="How the study ran."
        />
      </ki-sources>
    </div>
  ),
};

export const Expanded: Story = { ...Playground, args: { open: true } };
