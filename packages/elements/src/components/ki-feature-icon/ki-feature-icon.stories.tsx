import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';

import { sizes, toneGlyphs } from './gallery';
import type { KiFeatureIcon } from './ki-feature-icon';

type Args = Pick<KiFeatureIcon, 'tone' | 'size' | 'shape'>;

const meta = {
  title: 'Elements/ki-feature-icon',
  component: 'ki-feature-icon',
  args: { tone: 'neutral', size: 'md', shape: 'square' },
  argTypes: {
    tone: { control: 'select', options: toneGlyphs.map(([tone]) => tone) },
    size: { control: 'select', options: sizes },
    shape: { control: 'radio', options: ['square', 'circle'] },
  },
} satisfies Meta<Args>;

const rowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--ki-space-md)',
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {
  render: (args) =>
    h(
      'div',
      { style: rowStyle },
      h('ki-feature-icon', args, h('ki-icon', { name: 'shield-check' })),
      h('h2', null, 'Security settings'),
    ),
};

export const Tones: Story = {
  render: () =>
    h(
      'div',
      { style: rowStyle },
      toneGlyphs.map(([tone, glyph]) =>
        h('ki-feature-icon', { key: tone, tone }, h('ki-icon', { name: glyph })),
      ),
    ),
};

export const Sizes: Story = {
  render: () =>
    h(
      'div',
      { style: rowStyle },
      sizes.map((size) =>
        h(
          'ki-feature-icon',
          { key: size, size, tone: 'primary-light' },
          h('ki-icon', { name: 'layers' }),
        ),
      ),
    ),
};

export const RightToLeft: Story = {
  render: () =>
    h(
      'div',
      { dir: 'rtl', style: rowStyle },
      h(
        'ki-feature-icon',
        { shape: 'circle', tone: 'primary-light' },
        h('ki-icon', { name: 'shield-check' }),
      ),
      h('h2', null, 'Workspace access'),
    ),
};
