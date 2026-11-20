import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { KiCodeBlock } from './ki-code-block';

type Args = Pick<
  KiCodeBlock,
  'language' | 'filename' | 'lineNumbers' | 'highlight' | 'wrap' | 'copyable' | 'label'
>;

const source = "import { load } from './loader';\n// Fetch the sample once.\nconst size = load(3);";
const meta = {
  title: 'Elements/ki-code-block',
  component: 'ki-code-block',
  args: { language: 'ts', filename: 'main.ts', lineNumbers: true, highlight: '3' },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Highlighted: Story = {
  render: (args) => <ki-code-block {...args}>{source}</ki-code-block>,
};

export const Wrapped: Story = {
  args: {
    language: 'json',
    filename: 'settings.json',
    wrap: true,
    copyable: false,
    highlight: '2',
  },
  render: (args) => (
    <div style={{ maxInlineSize: 'var(--ki-size-surface-sm)' }}>
      <ki-code-block {...args}>
        {'{\n  "label": "This example wraps within the available width."\n}'}
      </ki-code-block>
    </div>
  ),
};

export const RightToLeft: Story = {
  render: (args) => (
    <ki-code-block {...args} dir="rtl">
      {source}
    </ki-code-block>
  ),
};
