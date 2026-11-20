import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-chip-group',
  component: 'ki-chip-group',
  args: { label: 'Recipients', type: 'input', reorderable: true },
} satisfies Meta<JSX.KiChipGroup>;

export default meta;

export const Reorderable: StoryObj<JSX.KiChipGroup> = {
  render: (args) => (
    <ki-chip-group {...args}>
      <ki-chip value="ana" removable>
        Ana García
      </ki-chip>
      <ki-chip value="luis" removable>
        Luis
      </ki-chip>
      <ki-chip value="team">Design team</ki-chip>
    </ki-chip-group>
  ),
};
