import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-citation',
  component: 'ki-citation',
  args: { citationRef: 'citation-demo', labelTemplate: 'Source {number}: {title}' },
} satisfies Meta<JSX.KiCitation>;

export default meta;
type Story = StoryObj<JSX.KiCitation>;

export const Playground: Story = {
  render: (args) => (
    <div>
      <p>
        The test ran under the documented conditions
        <ki-citation {...args} />.
      </p>
      <ki-sources>
        <ki-source
          id="citation-demo"
          href="https://example.org/conditions"
          sourceTitle="Conditions"
        />
      </ki-sources>
    </div>
  ),
};
