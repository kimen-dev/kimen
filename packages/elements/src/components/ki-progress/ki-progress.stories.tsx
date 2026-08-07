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

// Explicit demo widths: spacing tokens are not layout frame sizes, and the
// centered layout otherwise collapses the width-less linear track to zero.
const stackStyle = {
  display: 'grid',
  gap: 'var(--ki-space-3xl)',
  inlineSize: '16rem',
};

export const Playground: Story = {
  render: (args) => <ki-progress {...args} style={{ inlineSize: '20rem' }} />,
};

export const ShapeModeMatrix: Story = {
  render: (args) => (
    <div style={stackStyle}>
      {(['linear', 'circular'] as const).map((shape) =>
        ([false, true] as const).map((indeterminate) => (
          <ki-progress
            {...args}
            shape={shape}
            indeterminate={indeterminate}
            label={`${shape} ${indeterminate ? 'loading' : 'uploading'}`}
          />
        )),
      )}
    </div>
  ),
};

/** Determinate circular boundaries: 0% and 100% render without arc artifacts. */
export const CircularBoundaries: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 'var(--ki-space-3xl)', alignItems: 'center' }}>
      <ki-progress {...args} shape="circular" value={0} label="Not started" />
      <ki-progress {...args} shape="circular" value={100} label="Complete" />
    </div>
  ),
};

/** Logical-properties-only layout: the determinate fill tracks `dir="rtl"`. */
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl" style={{ inlineSize: '16rem' }}>
      <ki-progress {...args} />
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
