import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

// Keep the fixture served over HTTP in the compiled workshop as well as dev.
const hills = new URL('./fixtures/hills.svg?no-inline', import.meta.url).href;

const meta: Meta<JSX.KiImage> = {
  title: 'Elements/ki-image',
  component: 'ki-image',
  parameters: { layout: 'centered' },
  args: { src: hills, alt: 'Low green hills under a pale sky', ratio: '16:9' },
  decorators: [(story) => <div style={{ inlineSize: 'min(32rem, 86vw)' }}>{story()}</div>],
};

export default meta;
type Story = StoryObj<JSX.KiImage>;

export const Playground: Story = {
  render: (args) => (
    <ki-image {...args}>
      <span slot="caption">View from the ridge</span>
    </ki-image>
  ),
};

export const Fitting: Story = {
  args: { ratio: '1:1' },
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 'var(--ki-spacing-inline)',
      }}
    >
      <ki-image {...args} fit="cover">
        <span slot="caption">Cropped to fill</span>
      </ki-image>
      <ki-image {...args} fit="contain">
        <span slot="caption">Whole image</span>
      </ki-image>
    </div>
  ),
};

export const RefusedSource: Story = {
  args: {
    src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    alt: 'Office floor plan',
    ratio: '4:3',
  },
  render: (args) => <ki-image {...args} />,
};

export const Decorative: Story = {
  args: { decorative: true, alt: '' },
  render: (args) => <ki-image {...args} />,
};
