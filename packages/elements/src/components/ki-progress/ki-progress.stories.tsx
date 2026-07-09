import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-progress',
  component: 'ki-progress',
  parameters: {
    layout: 'centered',
  },
  args: {
    value: 40,
    max: 100,
    indeterminate: false,
    shape: 'linear',
    label: 'Uploading report.pdf',
  },
} satisfies Meta<JSX.KiProgress>;

export default meta;
type Story = StoryObj<JSX.KiProgress>;

const stackStyle = {
  display: 'grid',
  gap: 'var(--ki-space-3xl)',
  inlineSize: 'var(--ki-space-26xl)',
};

const rowStyle = {
  display: 'grid',
  gap: 'var(--ki-space-lg)',
};

export const Playground: Story = {};

export const ShapeModeMatrix: Story = {
  render: (args) => (
    <div style={stackStyle}>
      {(['linear', 'circular'] as const).map((shape) =>
        ([false, true] as const).map((indeterminate) => (
          <div style={rowStyle}>
            <ki-progress
              {...args}
              shape={shape}
              indeterminate={indeterminate}
              label={`${shape} ${indeterminate ? 'loading' : 'uploading'}`}
            />
          </div>
        )),
      )}
    </div>
  ),
};

export const MalformedValues: Story = {
  render: (args) => (
    <div style={stackStyle}>
      {(
        [
          ['-10', '100'],
          ['abc', '100'],
          ['40', '0'],
          ['40', '-5'],
          ['40', 'abc'],
        ] as const
      ).map(([value, max]) => (
        <ki-progress
          {...args}
          value={Number(value)}
          max={Number(max)}
          label={`value ${value} max ${max}`}
        />
      ))}
    </div>
  ),
};
