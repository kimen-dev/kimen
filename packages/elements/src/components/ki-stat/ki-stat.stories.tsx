import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiStat } from './ki-stat';

type Args = Pick<
  KiStat,
  'label' | 'value' | 'unit' | 'format' | 'delta' | 'deltaFormat' | 'direction' | 'deltaLabel'
>;

const meta = {
  title: 'Elements/ki-stat',
  component: 'ki-stat',
  render: (args) => h('ki-stat', args),
} satisfies Meta<Args>;

export default meta;

export const Playground: StoryObj<Args> = {
  args: {
    label: 'Median render time',
    value: 84,
    unit: 'ms',
    delta: -9,
    direction: 'lower-is-better',
    deltaLabel: 'vs last week',
  },
};

export const PercentChange: StoryObj<Args> = {
  args: {
    label: 'Active surfaces',
    value: 1284,
    deltaLabel: 'vs last week',
    delta: 0.12,
    direction: 'higher-is-better',
    deltaFormat: { style: 'percent' },
  },
};

export const UnfavorableRise: StoryObj<Args> = {
  args: { label: 'Blocked components', value: 37, delta: 5, direction: 'lower-is-better' },
};

export const ValueOnly: StoryObj<Args> = {
  args: { label: 'Builds this week', value: 148 },
};

export const WithChart: StoryObj<Args> = {
  args: { label: 'Sales', value: 750 },
  render: (args) => (
    <ki-stat {...args}>
      <svg
        slot="chart"
        role="img"
        aria-label="Sales rose from 680 to 750 this week"
        viewBox="0 0 80 20"
        width="80"
        height="20"
      >
        <path d="M1 17 L13 11 L27 14 L39 4 L52 8 L67 5 L79 1" fill="none" stroke="currentColor" />
      </svg>
    </ki-stat>
  ),
};
