import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-skeleton',
  component: 'ki-skeleton',
  args: { shape: 'text', lines: 3, animated: true },
  argTypes: {
    shape: { control: 'select', options: ['text', 'circle', 'rect'] },
    lines: { control: { type: 'number', min: 1, max: 20, step: 1 } },
  },
} satisfies Meta<JSX.KiSkeleton>;

export default meta;
type Story = StoryObj<JSX.KiSkeleton>;

export const Playground: Story = {
  render: (args) => (
    <section aria-label="Loading preview" aria-busy="true" style={{ maxInlineSize: '18rem' }}>
      <ki-skeleton {...args} />
    </section>
  ),
};

export const ProjectCard: Story = {
  render: () => (
    <section
      aria-label="Loading project"
      aria-busy="true"
      style={{
        display: 'grid',
        gap: 'var(--ki-space-md)',
        maxInlineSize: '18rem',
        padding: 'var(--ki-space-xl)',
        border: 'var(--ki-border-hairline-base-em)',
        borderRadius: 'var(--ki-radius-component-lg)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          alignItems: 'center',
          gap: 'var(--ki-space-md)',
        }}
      >
        <ki-skeleton shape="circle" size="2.5rem" />
        <ki-skeleton lines={2} inlineSize="60%" />
      </div>
      <ki-skeleton shape="rect" blockSize="6rem" />
      <ki-skeleton lines={2} />
    </section>
  ),
};

export const AssistantReply: Story = {
  render: () => (
    <section aria-label="Assistant is writing" aria-busy="true" style={{ maxInlineSize: '16rem' }}>
      <ki-skeleton lines={3} />
    </section>
  ),
};
