import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { KiSlider } from './ki-slider';

type Args = Pick<
  KiSlider,
  | 'label'
  | 'range'
  | 'min'
  | 'max'
  | 'marks'
  | 'format'
  | 'currency'
  | 'centered'
  | 'orientation'
  | 'disabled'
> & { value?: number | string };

const meta = {
  title: 'Elements/ki-slider',
  component: 'ki-slider',
  args: { label: 'Volume', marks: 5, value: 60 },
} satisfies Meta<Partial<Args>>;

export default meta;
type Story = StoryObj<Partial<Args>>;

export const Playground: Story = {
  render: (args) => <ki-slider {...args} style={{ inlineSize: 'min(100%, 22rem)' }} />,
};

export const Range: Story = {
  args: {
    label: 'Price',
    range: true,
    marks: 0,
    value: '20,80',
    format: 'currency',
    currency: 'EUR',
  },
  render: (args) => <ki-slider {...args} lang="en-IE" style={{ inlineSize: 'min(100%, 22rem)' }} />,
};

export const Centered: Story = {
  args: { label: 'Exposure', centered: true, min: -50, max: 50, value: -20, marks: 0 },
  render: (args) => <ki-slider {...args} dir="rtl" style={{ inlineSize: 'min(100%, 22rem)' }} />,
};

export const Vertical: Story = {
  args: { label: 'Bass', orientation: 'vertical', max: 10, value: 4 },
  render: (args) => <ki-slider {...args} style={{ inlineSize: 'max-content' }} />,
};

export const Disabled: Story = {
  args: { label: 'Locked level', disabled: true },
  render: (args) => <ki-slider {...args} style={{ inlineSize: 'min(100%, 22rem)' }} />,
};
