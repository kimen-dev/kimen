import { h } from '@stencil/core';
import type { Meta, StoryObj } from '@stencil/storybook-plugin';
import type { JSX } from '../../components';

const meta = {
  title: 'Elements/ki-avatar-group',
  component: 'ki-avatar-group',
  parameters: {
    layout: 'centered',
  },
  args: {
    size: 'md',
    max: 3,
  },
} satisfies Meta<JSX.KiAvatarGroup>;

export default meta;
type Story = StoryObj<JSX.KiAvatarGroup>;

function Members(): HTMLElement[] {
  return [
    <ki-avatar label="Ana García" initials="AG" />,
    <ki-avatar label="Sam Bel" initials="SB" />,
    <ki-avatar label="Iris Toma" initials="IT" />,
    <ki-avatar label="Leo Duarte" initials="LD" />,
    <ki-avatar label="Mia Chen" initials="MC" />,
    <ki-avatar label="Noa Katz" initials="NK" />,
    <ki-avatar label="Pau Riba" initials="PR" />,
    <ki-avatar label="Uma Devi" initials="UD" />,
  ];
}

/** Interactive playground: the visible cap and group size as controls. */
export const Playground: Story = {
  render: (args) => <ki-avatar-group {...args}>{Members()}</ki-avatar-group>,
};

/** Without a cap every member renders and no counter appears (never "+0"). */
export const Uncapped: Story = {
  render: () => (
    <ki-avatar-group>
      <ki-avatar label="Ana García" initials="AG" />
      <ki-avatar label="Sam Bel" initials="SB" />
      <ki-avatar label="Iris Toma" initials="IT" />
    </ki-avatar-group>
  ),
};

/** The group size governs every member; member-declared sizes are overridden. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--ki-space-5xl)', justifyItems: 'start' }}>
      <ki-avatar-group {...args} size="xxs">
        {Members()}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="sm">
        {Members()}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="md">
        {Members()}
      </ki-avatar-group>
      <ki-avatar-group {...args} size="xl">
        {Members()}
      </ki-avatar-group>
    </div>
  ),
};

/** The stack and its trailing counter follow the writing direction. */
export const RTL: Story = {
  render: (args) => (
    <div dir="rtl">
      <ki-avatar-group {...args}>{Members()}</ki-avatar-group>
    </div>
  ),
};
