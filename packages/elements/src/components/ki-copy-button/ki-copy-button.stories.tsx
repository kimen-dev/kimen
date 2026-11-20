import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-copy-button',
  component: 'ki-copy-button',
  args: {
    value: 'https://kimen.dev/i/4f9a',
    label: 'Copy invite link',
    variant: 'ghost',
    size: 'md',
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'quaternary', 'ghost'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
} satisfies Meta<JSX.KiCopyButton>;

export default meta;
type Story = StoryObj<JSX.KiCopyButton>;

export const IconOnly: Story = {
  render: (args) => <ki-copy-button {...args} />,
};

export const Labelled: Story = {
  args: { value: 'token-4f9a', variant: 'secondary' },
  render: (args) => <ki-copy-button {...args}>Copy token</ki-copy-button>,
};

export const ReferencedField: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'end', gap: 'var(--ki-space-md)' }}>
      <ki-input
        id="copy-story-invite"
        label="Invite link"
        value="https://kimen.dev/i/4f9a"
        readonly
      />
      <ki-copy-button from="copy-story-invite" label="Copy invite link" variant="secondary" />
    </div>
  ),
};

export const CopyError: Story = {
  render: () => <ki-copy-button from="missing-source">Copy token</ki-copy-button>,
};
