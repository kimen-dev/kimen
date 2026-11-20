import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-prompt-input',
  component: 'ki-prompt-input',
  args: {
    label: 'Message Kimen Assistant',
    placeholder: 'Ask anything, or drop a file',
    accept: '.csv,.pdf,image/*',
    maxFiles: 5,
    maxSize: 5_000_000,
  },
} satisfies Meta<JSX.KiPromptInput>;

export default meta;
type Story = StoryObj<JSX.KiPromptInput>;

export const Playground: Story = {};

export const ModelPicker: Story = {
  render: (args) => (
    <ki-prompt-input {...args}>
      <select slot="tools" aria-label="Model">
        <option>Standard</option>
        <option>Careful</option>
      </select>
    </ki-prompt-input>
  ),
};

export const Submitted: Story = {
  args: { status: 'submitted', value: 'I have a follow-up question.' },
};

export const Streaming: Story = {
  args: { status: 'streaming' },
};

export const ModifierEnter: Story = {
  args: { submitOn: 'mod-enter', value: 'Enter adds a line. Control or Command with Enter sends.' },
};
