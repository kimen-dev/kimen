import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { KiToolCall } from './ki-tool-call';

type Args = Pick<KiToolCall, 'name' | 'toolTitle' | 'status' | 'duration' | 'retryable'> & {
  open?: boolean;
};

const meta = {
  title: 'Elements/ki-tool-call',
  component: 'ki-tool-call',
  args: { name: 'search_docs', toolTitle: 'Search docs' },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Completed: Story = {
  args: { status: 'done', duration: 1200, open: true },
  render: (args) => (
    <ki-tool-call {...args}>
      <ki-code-block slot="input" language="json" filename="search-input.json" wrap>
        {'{"query": "Form validation"}'}
      </ki-code-block>
      <ki-code-block slot="output" language="json" filename="search-output.json" wrap>
        {'["Field help and errors"]'}
      </ki-code-block>
    </ki-tool-call>
  ),
};

export const Running: Story = {
  args: { name: 'run_tests', toolTitle: 'Run tests', status: 'running' },
  render: (args) => <ki-tool-call {...args} />,
};

export const Failed: Story = {
  args: { name: 'build_preview', toolTitle: 'Build preview', status: 'failed', retryable: true },
  render: (args) => (
    <ki-tool-call {...args}>
      <span slot="error">The build was interrupted.</span>
    </ki-tool-call>
  ),
};

export const AwaitingApproval: Story = {
  args: { name: 'publish_preview', toolTitle: 'Publish preview', status: 'approval' },
  render: (args) => <ki-tool-call {...args} />,
};
